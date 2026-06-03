import torch
import torch.nn as nn
import torch.optim as optim
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from monitor.models import Endpoints
from model.models import TrainingRun

class SLAPredictor(nn.Module):
    def __init__(self):
        super(SLAPredictor, self).__init__()
        self.fc1 = nn.Linear(3, 16)
        self.fc2 = nn.Linear(16, 1)
        self.relu = nn.ReLU()

    def forward(self, x):
        x = self.relu(self.fc1(x))
        x = self.fc2(x)
        return x

@csrf_exempt
def train_model(request):
    if request.method == 'POST' or request.method == 'GET':
        endpoints = Endpoints.objects.all()
        
        if not endpoints:
            return JsonResponse({'status': 'error', 'message': 'No data available for training'}, status=400)

        # Prepare dummy dataset
        # Features: status_code (scaled / 100), response_time (seconds), is_active (0 or 1)
        # Target (dummy SLA): 100 if active and 2xx, minus penalty for response_time
        x_data = []
        y_data = []

        for ep in endpoints:
            status = float(ep.status_code) / 100.0
            resp_time = ep.response_time.total_seconds()
            active = 1.0 if ep.is_active else 0.0

            x_data.append([status, resp_time, active])

            # Dummy target
            target_sla = 100.0
            if not ep.is_active or ep.status_code >= 400:
                target_sla = 0.0
            else:
                target_sla = max(0.0, 100.0 - (resp_time * 5.0)) # penalize 5% per second
            
            y_data.append([target_sla])

        X = torch.tensor(x_data, dtype=torch.float32)
        Y = torch.tensor(y_data, dtype=torch.float32)

        model = SLAPredictor()
        criterion = nn.MSELoss()
        optimizer = optim.Adam(model.parameters(), lr=0.01)

        # Train for 50 epochs
        final_loss = 0.0
        for epoch in range(50):
            optimizer.zero_grad()
            outputs = model(X)
            loss = criterion(outputs, Y)
            loss.backward()
            optimizer.step()
            final_loss = loss.item()

        # Evaluate (average predicted SLA)
        model.eval()
        with torch.no_grad():
            preds = model(X)
            avg_predicted_sla = preds.mean().item()

        # Save to DB
        run = TrainingRun.objects.create(
            average_sla=avg_predicted_sla,
            loss=final_loss
        )

        return JsonResponse({
            'status': 'success',
            'message': 'Model trained successfully',
            'average_sla': avg_predicted_sla,
            'loss': final_loss,
            'run_id': str(run.id)
        })

    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

def get_latest_training(request):
    if request.method == 'GET':
        run = TrainingRun.objects.first()
        if run:
            return JsonResponse({
                'status': 'success',
                'average_sla': run.average_sla,
                'loss': run.loss,
                'created_at': run.created_at
            })
        else:
            return JsonResponse({
                'status': 'success',
                'average_sla': None,
                'message': 'No training runs available'
            })
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

