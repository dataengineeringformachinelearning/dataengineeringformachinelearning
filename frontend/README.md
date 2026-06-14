# Frontend

This is the Angular frontend application for the Data Engineering for Machine Learning project.

## How to run locally

1. Navigate to the `frontend` directory:

```bash
cd frontend
```

2. Install the required dependencies:

```bash
npm install --legacy-peer-deps
```

3. Start the development server:

```bash
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Local Configuration (Firebase & Infisical)

To run the application with your own Firebase keys locally without committing them to source control, configure your environment variables:

1. **Option A: Create your `.env` file**:
   Copy the sample environment variables:

   ```bash
   cp .env.example .env
   ```

   Open the `.env` file and fill in your actual Firebase configurations.

2. **Option B: Infisical Secret Vault (Recommended)**:
   Ensure you have the Infisical CLI installed (`brew install infisical/tap/infisical`) and run:

   ```bash
   infisical run -- npm start
   ```

3. **Run with `dotenvx`**:
   Alternatively, run the dev server using the locally installed `dotenvx`:
   ```bash
   npx dotenvx run -- npm start
   ```
   _(Running this command dynamically runs the environment generator and updates the environment files at startup)._

> [!NOTE]
> If you ever need to manually install additional dependencies in this project, you must append `--legacy-peer-deps` due to the strict version constraints of the test suite and framework dependencies (e.g., `npm install @dotenvx/dotenvx --save-dev --legacy-peer-deps`).

### Production Container Design

In production, the Angular build output is served via Nginx using the highly secure `cgr.dev/chainguard/nginx:latest` container image. This base image has a zero-vulnerability footprint and does not run as root, ensuring compliance with SOC 2 CC6.6 and CMMC 2.0 SC.L2-3.13.1.

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
npm install --legacy-peer-deps
```

### Upgrading Packages

To safely update your frontend packages to their latest minor and patch versions:

```bash
npm update
```

If you need to perform a major version upgrade for Angular (e.g., from Angular 21 to 22), use the Angular CLI update tool to ensure a safe migration:

```bash
npx @angular/cli@22 update @angular/core@22 @angular/cli@22
```
