# Frontend

This is the Angular frontend application for the Data Engineering for Machine Learning project.

## How to run locally

1. Navigate to the `frontend` directory:

```bash
cd frontend
```

2. Install the required dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

### Troubleshooting NPM running slow

#### Remove the node_modules folder

```bash
rm -rf node_modules
```

#### Remove the package-lock.json file
```bash
rm -f package-lock.json
```

#### Clean the NPM cache (forces NPM to fetch fresh data)

```bash
npm cache clean --force
```

Then try installing the dependencies again:

```bash
npm install
```