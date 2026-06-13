# Studio

This is the Sanity Studio content management application for the Data Engineering for Machine Learning project. It is used to manage announcements, system status, and other CMS-driven content.

## How to run locally

1. Navigate to the `studio` directory:

```bash
cd studio
```

2. Install the required dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

Once the server is running, open your browser and navigate to `http://localhost:3333/`. The Sanity Studio will automatically reload whenever you modify any of the schema files.

## Troubleshooting NPM running slow

If you encounter dependency issues or slow installs, you can reset your local `node_modules` by running:

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

## Upgrading Sanity Studio

To safely update Sanity-specific packages and other dependencies to their latest compatible versions:

```bash
npx sanity upgrade
```

To update other package dependencies:

```bash
npm update
```
