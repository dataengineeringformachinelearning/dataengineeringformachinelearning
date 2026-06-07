import torch
import torch.nn as nn
import torch.optim as optim
from model.models import TrainingRun
from monitor.models import MonitoredService, Endpoints

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

def train_tenant_sla(status_page):
    # Get services for this status page
    services = MonitoredService.objects.filter(status_page=status_page)
    urls = [s.url for s in services]
    
    if not urls:
        return None

    endpoints = Endpoints.objects.filter(url__in=urls)
    if not endpoints.exists():
        return None

    x_data = []
    y_data = []

    for ep in endpoints:
        status = float(ep.status_code) / 100.0
        resp_time = ep.response_time.total_seconds()
        active = 1.0 if ep.is_active else 0.0

        x_data.append([status, resp_time, active])

        target_sla = 100.0
        if not ep.is_active or ep.status_code >= 400:
            target_sla = 0.0
        else:
            target_sla = max(0.0, 100.0 - (resp_time * 5.0))
        
        y_data.append([target_sla])

    X = torch.tensor(x_data, dtype=torch.float32)
    Y = torch.tensor(y_data, dtype=torch.float32)

    model = SLAPredictor()
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.01)

    final_loss = 0.0
    for epoch in range(50):
        optimizer.zero_grad()
        outputs = model(X)
        loss = criterion(outputs, Y)
        loss.backward()
        optimizer.step()
        final_loss = loss.item()

    model.eval()
    with torch.no_grad():
        preds = model(X)
        avg_predicted_sla = preds.mean().item()

    run = TrainingRun.objects.create(
        status_page=status_page,
        average_sla=avg_predicted_sla,
        loss=final_loss
    )
    return run
