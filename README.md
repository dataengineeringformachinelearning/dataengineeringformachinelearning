# Data Engineering for Machine Learning

Interactive steps, working notes, and AI annotation on the Data Engineering for Machine Learning book.

## Chapter 1: Introduction

Picking a language for data engineering is a personal preference. I chose Python because it is easy to learn and has a large community. Angular provides a TypeScript interface for data engineering. Windsurf AI provides an AI based editor for data engineering. Through this book, I will be using Angular and Windsurf AI to build a data engineering application. Python will be used for data engineering tasks. I will cover everything from the basics to advanced topics, starting from square one to an enterprise level data engineering application.

### Chapter 1.1: Introduction

#### Chapter 1.1.1: Setting up the frontend environment

Open a terminal window, you can do this by pressing `Cmd + Space` and typing `Terminal` or finding it in your Applications folder under Utilities.

Install Homebrew:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Verify Homebrew installation:

```bash
brew --version
```

You should also install Rosetta 2 for Apple Silicon Macs:

```bash
softwareupdate --install-rosetta
```

This allows compatibility with x86_64 binaries on Apple Silicon Macs.

You can read more about Homebrew at https://brew.sh/.

Install Windsurf AI:

```bash
brew install windsurf
```

Visit https://windsurf.com/ to learn more about Windsurf AI and installation instructions.

Install Node:

```bash
brew install node
```

Visit https://nodejs.org/ to learn more about Node and installation instructions.

If you need to manage multiple versions of node, you can use nvm (Node Version Manager):

```bash
brew install nvm
```

Visit https://github.com/nvm-sh/nvm to learn more about nvm and installation instructions.

Install Angular:

```bash
brew install angular-cli
```

Install Angular CLI with NPM:

```bash
npm install -g @angular/cli
```

Visit https://angular.io/cli / https://angular.dev/installation to learn more about the Angular CLI and installation instructions.

Create a new Angular project:

```bash
ng new frontend
```

Change to the new directory:

```bash
cd frontend
```

Check the directory files:

```bash
ls
```

Change directory to the frontend directory:

```bash
cd frontend
```

Install the Angular packages:

```bash
npm install
```

Start the Angular development server:

```bash
npm start
```

Visit http://localhost:4200 to view the application.

#### Chapter 1.1.2: Creating a repository for version control

Create a new repository on GitHub, if you don't have one already you can create one at https://github.com/new.

Once the repository is created you will be given a URL to clone the repository. You can clone the repository using the following command:

```bash
git clone <repository-url>
```

Alternatively using GitHub Desktop which can be downloaded from https://desktop.github.com/.

Once the repository is cloned, you can make a folder within that called `frontend` and `backend`.

Copy the content of the `data-engineering-for-machine-learning` directory into the `frontend` directory, including the hidden files that may be present.

Once you have copied the content, you can remove the `data-engineering-for-machine-learning` directory and commit the changes to the git repository.

In the git respository create a Dockerfile for the frontend, which should use Angular and Node as the base image and install the dependencies. The Dockerfile should also have a command to run the Angular development server.

#### Chapter 1.1.3: Setting up Docker for the frontend

Install Docker CLI with homebrew:

```bash
brew install docker
```

You can read more about Docker at https://www.docker.com/.

The Docker UI can be downloaded from https://www.docker.com/products/docker-desktop/ and should help familiarize you with Docker.

Create a `Dockerfile` in the frontend folder

Example dockerfile:

```dockerfile
# Build stage
FROM node:22-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy package files for better caching
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm install && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build --prod

# Production stage
FROM nginx:1.27-alpine

# Install security updates and remove unnecessary packages
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create nginx cache directories and set permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /var/run

# Copy built application from builder stage
COPY --from=builder --chown=nginx:nginx /app/dist/frontend/browser /usr/share/nginx/html

# Verify Angular build files exist
RUN ls -la /usr/share/nginx/html/ && test -f /usr/share/nginx/html/index.html

# Remove default nginx configuration and copy our config
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 8080

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"]
```

Also create an `nginx.conf` file to configure the nginx server which reverse proxies requests to the Angular application from the port 8080.

```nginx
server {
    listen 8080;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Ensure we serve index.html for all routes (SPA fallback)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Add explicit index.html handling
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Debug endpoint to verify nginx is working
    location /nginx-status {
        access_log off;
        return 200 "nginx is running\n";
        add_header Content-Type text/plain;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Create a `.dockerignore` file to exclude unnecessary files from the Docker build context:

```dockerignore
node_modules
.git
.gitignore
README.md
```

Once you have created the Dockerfile, you can build the image using the following Docker CLIcommand:

```bash
docker build -t data-engineering-for-machine-learning-frontend .
```

Using Docker CLI, you can run the container using the following command:

```bash
docker run -p 8080:8080 data-engineering-for-machine-learning-frontend
```

Alternatively, you can run the container with a custom port to validate that the application is listening on the correct port:

```bash
docker run --rm -p 8080:8080 -e PORT=8080 data-engineering-for-machine-learning-frontend
```

You should see these containers and images in the Docker Desktop application.

Visit http://localhost:8080 to view the application.

At this stage it is a good point to commit the changes to the git repository. Also deploy the application to a platform such as Railway (https://railway.app/) with Docker or as code with Google Firebase (https://firebase.google.com/).

You can use a domain from the provider or purchase a domain from Cloudflare (https://www.cloudflare.com/) or Namecheap (https://www.namecheap.com/). Cloudflare provides direct integration with Railway so it is a good choice, not including all of the security features that Cloudflare provides.

When deploying on Railway, make sure to set the directory to the `/frontend` directory and when adding the domain use the default `8080` port as the listening port unless you have configured a different port in your Dockerfile, then use that port. Connecting Cloudflare is the easiest way to manage the DNS records.

#### Chapter 1.1.4: Implementing a basic user interface (UI)

Pick a font from Google Fonts: https://fonts.google.com/

Add the font to the styles.scss file:

```scss
@import url("https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,100..900;1,100..900&display=swap");
```

Add the font to the index.html file:

```html
<link
  href="https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,100..900;1,100..900&display=swap"
  rel="stylesheet"
/>
```

Pick a color from Coolors: https://coolors.co/

Make a .scss file in the src directory:

```bash
mkdir src/theme
```

Add the exported scss theme from coolors to the theme.scss file:

```scss
@use "./theme";
```

A lot of styling should be built mobile first, then enhanced for desktop. So make sure to make the media queries for desktop at the end of the stylesheet, and work from small to large.

You can find good examples of media query sizes from https://www.w3schools.com/css/css_rwd_mediaqueries.asp.

Install Angular Material:

```bash
npm install @angular/material @angular/cdk @angular/animations
```

Visit https://material.angular.io/guide/getting-started to learn more about Angular Material and installation instructions.

Choose a logo from the Noun Project: https://thenounproject.com/

https://thenounproject.com/icon/data-quality-6448061/

**The Logo for this project is the Data Quality icon from the Noun Project (data quality by Naya Putri from <a href="https://thenounproject.com/browse/icons/term/data-quality/" target="_blank" title="data quality Icons">Noun Project</a> (CC BY 3.0))**

Download the logo as an SVG file and save it to the src/assets directory. You can edit it with any vector editor. I prefer to use Figma: https://www.figma.com/.

Save a version of the logo as a PNG file in the src/assets directory and a version as a SVG file in the src/assets directory.

You may also want to generate a preview image in a ratio of 16:9 for social media and save that as a PNG file in the src/assets directory.

You can also generate a favicon from the logo using an online tool: https://realfavicongenerator.net/. Once you have generated the favicon, copy the files to the public directory and paste the code into the index.html file.

Add some SEO tags to the index.html file, you can use MetaTags from https://metatags.io/ to generate the tags.

In the app.html file Add the logo that was saved in the src/assets directory. You can use the img tag to add the logo.

```html
<img src="src/assets/logo.png" alt="Logo" />
```

A trick to make the logo responsive is to use the `max-width: 100%` property in scss so that the logo will not overflow the container.

Add an H1 tag with the title of the application.

```html
<h1>Angular</h1>
```

Add a description of the application below the H1 tag in a p tag.

```html
<p>
  This is a sample application that uses Angular to create a modern and
  responsive user interface.
</p>
```

Add a footer at the bottom of the page in the app.html file.

Use the main tag to wrap the content of the page, add a div tag with a class of content to wrap the logo, title, and description. Then add a div tag with a class of copyright to the footer to wrap the copyright information.

Use the styles.scss file to style the page and use flexbox to align the content and footer as a column vertically. A good example of this is from CSS-Tricks: https://css-tricks.com/snippets/css/a-guide-to-flexbox/.

Commit your changes to the git repository, always commit with a message that describes the changes and do this often, this will help you keep track of your progress and make it easier to revert to a previous state if needed, and the state of change, should be minor updates within a larger feature branch, that is then merged into the main branch and deployed to the production environment.

You can use the command line to commit your changes:

```bash
git add .
git commit -m "Add logo and styling"
```

Then check the file changes added to the staging area with the command line:

```bash
git status
```

Followed by pushing the changes to the remote repository:

```bash
git push
```

If for some reason you have a remote repository that is not set up, you can use the following command to set it up:

```bash
git remote add origin <remote-repository-url>
```

Then you can push the changes to the remote repository:

```bash
git push -u origin main
```

You can read more about git commands here: https://git-scm.com/docs and remote repository management here: https://docs.github.com/en/get-started/getting-started-with-git/about-remote-repositories.

#### Chapter 1.1.5: Setting up the backend environment

Install Python with Homebrew:

```bash
brew install python
```

Visit https://www.python.org/ to learn more about Python and installation instructions.

Set the homebrew origin for Python to the correct path:

```bash
echo 'export PATH="/opt/homebrew/opt/python@3.14/libexec/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Verify Python installation:

```bash
python --version
```

If you installed a newer version then you may need to update the path in the .zshrc file.

You can open the file as a text document using the following command:

```bash
open -e ~/.zshrc
```

After making changes to the .zshrc file, you need to reload it:

```bash
source ~/.zshrc
```

Your python installation should now be working correctly. You should see the version and not need to use `python3`.

Install pipx for managing Python libraries globally:

```bash
brew install pipx
```

Validate the pipx path using the following command:

```bash
pipx ensurepath
```

Then install Django using pipx:

```bash
pipx install django
```

Create a new folder change to the folder and create a new Django project:

```bash
mkdir backend
cd backend
django-admin startproject config .
```

Create the virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment:

```bash
source venv/bin/activate
```

Install Django in the virtual environment:

```bash
pip install django
```

Save the dependencies:

```bash
pip freeze > requirements.txt
```

Create a gitignore:

```bash
cat > .gitignore << 'EOF'
venv/
__pycache__/
*.pyc
.DS_Store
db.sqlite3
media/
staticfiles/
EOF
```

You can start the django application with the following command:

```bash
python manage.py runserver
```

View the application at http://127.0.0.1:8000/

Hit command + C to stop the server.

You can run the migrations to set up the database:

```bash
python manage.py migrate
```

To reopen the application source the virtual environment:

```bash
source venv/bin/activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Then run the server:

```bash
python manage.py runserver
```

#### Chapter 1.1.6: Setting up Docker for the backend

Update the requirements.txt file to include the following dependencies:

```txt
gunicorn==25.1.0
whitenoise==6.12.0
dj-database-url==3.1.2
psycopg2-binary==2.9.11
```

Create a docker file for the backend using docker, you can find more information about docker here: https://www.docker.com/

Create a `Dockerfile` in the backend folder

Example dockerfile:

```dockerfile
FROM python:3.14-slim

# Prevent Python from writing pyc files and buffer output
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install system dependencies (required for PostgreSQL/psycopg2)
RUN apt-get update && apt-get install -y \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project code
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput --clear

# Expose port
EXPOSE 8000

# Run migrations then start Gunicorn
CMD ["sh", "-c", "python manage.py migrate && gunicorn --bind 0.0.0.0:${PORT:-8000} config.wsgi:application --workers 3 --timeout 120"]
```

Create a `.dockerignore` file in the backend folder to exclude unnecessary files from the Docker build context:

```dockerignore
.git
.gitignore
__pycache__/
*.pyc
*.pyo
venv/
.env
.env.local
media/
staticfiles/
.DS_Store
node_modules/
```

Add to the INSTALLED_APPS list in `config/settings.py` after the Django apps:

```python
'whitenoise.runserver_nostatic',
```

Also add to the MIDDLEWARE list in `settings.py` after the Django SecurityMiddleware:

```python
'whitenoise.middleware.WhiteNoiseMiddleware',
```

Add the imports to the `settings.py` file:

```python
import os
import dj_database_url
```

Replace the quick-start development settings in `settings.py`:

```python
# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-izn^)q(e0k=rklyawiv0*4(unp)%4%@v54**mnt!@tw!thaub9')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')
```

Replace the databases settings in `settings.py`:

```python
# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASES = {
    'default': dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
        conn_health_checks=True,
    )
}
```

Replace the static files settings in `settings.py`:

```python
# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

Once you have created the Dockerfile, you can build the image using the following Docker CLI command:

```bash
docker build -t data-engineering-for-machine-learning-backend .
```

Using Docker CLI, you can run the container using the following command:

```bash
docker run -p 8000:8000 --env PORT=8000 data-engineering-for-machine-learning-backend
```

Alternatively, you can run the container with a custom port to validate that the application is listening on the correct port:

```bash
docker run --rm -p 8080:8080 -e PORT=8080 data-engineering-for-machine-learning-backend
```

You should see these containers and images in the Docker Desktop application.

Visit http://localhost:8080 to view the application.

Once you have a working build, you can deploy to Railway.

You can use the same domain as your frontend, adding a subdomain for the backend, such as backend.example.com.

When deploying on Railway, make sure to set the directory to the `/backend` directory and when adding the domain use the gunicorn `8008` port unless you are using a different port in docker. Connecting Cloudflare is the easiest way to manage the DNS records.

Also make sure to add the DEBUG (eg. False), SECRET_KEY which you can generate on djecrety https://djecrety.ir/ (eg. `$iu=$8m7f!sr_rzzl_2=1l)c7253nng1!adhyp7f@((nwyevve` - djecrety ir generates a 50 character string), and ALLOWED_HOSTS should be your domain (e.g., example.com, backend.example.com) environment variables to the Railway project.

#### Chapter 1.1.7: Implementing a basic user interface (UI) for the backend

Create a views file in the config folder to handle the home page:

```python
# config/views.py
from django.shortcuts import render

def home(request):
    return render(request, 'home.html')
```

Edit the urls file in the config folder to handle the home page:

```python
# config/urls.py
from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('admin/', admin.site.urls),
]
```
Create a base template in the templates folder:

```html
<!-- templates/base.html -->
<!DOCTYPE html>
<html>
<head>
    <title>My Django App</title>
</head>
<body>
    {% block content %}
    {% endblock %}
</body>
</html>
```

Add an image in the static folder and you can reference it as a static asset in the template like this:

```html
<!-- templates/home.html -->
{% extends 'base.html' %}
{% load static %}

{% block content %}
<h1>Welcome to My Django App</h1>
<img class="logo" src="{% static 'data-engineering-for-machine-learning.svg' %}" alt="Data Engineering for Machine Learning" />
{% endblock %}
```

Make sure you add the static files configuration in the settings.py file:

```python
# settings.py
STATIC_URL = '/static/'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]
```

You need to run the `collectstatic` command to collect the static files:
```bash
python manage.py collectstatic
```

Add css styling to the home page by creating a css file in the static folder and referencing it in the base template:

```html
<!-- templates/base.html -->
<!DOCTYPE html>
<html>
<head>
    <title>My Django App</title>
    <link rel="stylesheet" href="{% static 'css/style.css' %}">
</head>
<body>
    {% block content %}
    {% endblock %}
</body>
</html>
```

Similary to the frontend you can re-use the same css file in the static folder and reference it in the base template.

You can add a sitemap by creating a sitemaps.py file in the config folder and adding the following code:
```python
# config/sitemaps.py
from django.contrib.sitemaps import Sitemap
from django.urls import reverse

class StaticViewSitemap(Sitemap):
    priority = 0.5
    changefreq = 'daily'

    def items(self):
        return ['home']

    def location(self, item):
        return reverse(item)
```

Then add the sitemap to the urls.py file:
```python
# config/urls.py
from django.contrib import admin
from django.urls import path
from . import views
from django.contrib.sitemaps.views import sitemap
from .sitemaps import StaticViewSitemap

sitemaps = {
    'static': StaticViewSitemap,
}

urlpatterns = [
    path('', views.home, name='home'),
    path('admin/', admin.site.urls),
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
]
```

While you are adding a sitemap here, make sure to add one and a robots file to your frontend as well.

Another consideration when writing JavaScript code is using a formatter like Prettier to ensure consistent code style.

You can install Prettier in your repository by running:

```bash
npm install --save-dev prettier
```

After installing prettier you can create a configuration file in the root of your repository that will define the formatting rules:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5"
}
```

You should make sure you add a prettier ignore file to your repository to exclude generated files like the static files from the collectstatic command.

```prettierignore
# Dependencies
node_modules/

# Build outputs
dist/
build/

# Coverage reports
coverage/

# Angular cache
.angular/

# Logs
*.log

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

Read more about prettier in the [documentation](https://prettier.io/docs/en/index.html).

ESLint is another tool that can be used to ensure consistent code style and catch potential errors in your code. It can be installed in your repository by running:

```bash
ng add @angular-eslint/schematics
npm install --save-dev eslint-config-prettier eslint-plugin-prettier
```

This will align eslint with prettier and prevent conflicts between the two tools.

## Chapter 2: Integrating

### Chapter 2.1: Introduction

#### Chapter 2.1.1: Setting up backend APIs

In many applications using a Node framework as a frontend, the backend APIs are often set up using a framework like Express.js. In this case, we will be using Django as our backend framework. We can briefl note that using a TypeScript based middleware is a good way to encrypt the data in transit, but it is not always necessary, data can be encrypted at rest using various methods.

If you need to run a typescript middleware, which is common in these applications, or even the need for an independent web server, you can use the tsx package to run typescript files directly.

You can install it with the following command:

```bash
npm install --save-dev tsx
```

You can run typescript files with the following command:

```bash
npx tsx your-file.ts
```

If you want to run it in development mode with hot reloading, you can use the following command:

```bash
npx tsx --watch your-file.ts
```

To find out more about tsx, check out the [documentation](https://tsx.is/).

This is a great way to emulate a backend API in a development environment and test your frontend code, though we will review other options in Django this can be a great way to create an agentic API server that is structurally independent of your main application.

## Chapter 3: Interfaces and data integration

A common architecture for applications is to use a web server to serve a frontend application and a separate backend API to serve data. In this chapter, we will review how to set up a backend API and how to integrate it with the frontend application. The simple patterns established here will be repeated throughout the book, as they are fundamental to many data engineering and machine learning applications. We will make use of both internal and external APIs.

### Chapter 3.1: Introduction

#### Chapter 3.1.1: Integrating fullstack endpoints

Integrations through RESTful APIs with HTTP are a common way to build out fullstack applications. The backend healthcheck to the Python application, visible from the frontend Angular application, is one example of an API endpoint. The patterns established here will allow for scaled integrations.

Starting with the Django backend we can add another endpoint in the `config/views.py` file:

```python
# backend/config/views.py
from django.http import JsonResponse

def health(request):
    return JsonResponse({"status": "ok"})
```

The url to this endpoint is `/api/health` and that is configured in the `config/urls.py` file. This is a good example of how to add an entry for an endpoint to the Django backend.

```python
# backend/config/urls.py
from django.contrib import admin
from django.urls import path
from . import views
from django.contrib.sitemaps.views import sitemap
from .sitemaps import StaticViewSitemap

sitemaps = {
    'static': StaticViewSitemap,
}

urlpatterns = [
    path('', views.home, name='home'),
    path('api/health', views.health, name='health'),
    path('admin/', admin.site.urls),
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
]
```

This will allow for a healthcheck endpoint to be visible from the frontend application or other HTTP clients. It will return a JSON response with the status of the backend application.

To decide what origins (domain) are allowed to make a request to this endpoint, we can add the following to the `settings.py` file:

```python
# backend/config/settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:4200",
    "https://dataengineeringformachinelearning.com",
]
```

You can learn more about CORS and CORS_ALLOWED_ORIGINS in the [Django documentation](https://docs.djangoproject.com/en/5.1/ref/middleware/cors/#cors-settings).

It is best practice to use environment variables to determine the allowed origins. This can be setup with fallbacks or without fallbacks depending on your use-case. We use the django-cors-headers package to handle this: https://github.com/adamchainz/django-cors-headers. You can learn more about django-cors-headers in the [django-cors-headers documentation](https://github.com/adamchainz/django-cors-headers).

It can be installed with the following command:

```bash
pip install django-cors-headers
```

We will also need to add it to the `INSTALLED_APPS` list in `settings.py`:

```python
# backend/config/settings.py
INSTALLED_APPS = [
    'corsheaders',
    # ... other apps
]
```

This also needs to be added to the django middleware list:

```python
# backend/config/settings.py
MIDDLEWARE = [
    # ... other middleware
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    # ... other middleware
]
```

Then, we can add the `CORS_ALLOWED_ORIGINS` variable to the `settings.py` file. We will also add an environment variable to the `settings.py` file to determine the allowed origins.

```python
# backend/config/settings.py
import os

cors_allowed_origins = os.getenv('CORS_ALLOWED_ORIGINS', '')
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_allowed_origins.split(',')] if cors_allowed_origins else []
```

The `CORS_ALLOWED_ORIGINS` variable will be set in the production environment and will be used to determine the allowed origins. When running locally it will default to an empty string and will not allow any origins.

You need to access the environment variables by importing the `os` module and using the `os.getenv()` function. This is a common pattern in python projects. You can learn more about `os.getenv()` in the [python documentation](https://docs.python.org/3/library/os.html#os.getenv).

You can test the endpoint by running the following command:

```bash
curl http://localhost:8000/api/health
```

You can learn more about python environment variables, check out the [python documentation](https://docs.python.org/3/library/os.html#os.getenv). The package python-dotenv is a great way to manage environment variables in your python projects. You can install it with the following command:

```bash
pip install python-dotenv
```

Then, you need to configure Django to load these variables when the server starts. Add this to the top of your settings file:

```python
# backend/config/settings.py
from pathlib import Path
import os
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from a .env file located at the BASE_DIR (backend/)
load_dotenv(BASE_DIR / '.env')
```

When running in your local environment, you can create a `.env` file in the `backend/` directory with the following content:

```ini
CORS_ALLOWED_ORIGINS="http://localhost:4200,https://dataengineeringformachinelearning.com"
```

This can be added to the cloud environment and should be overriden by the production `CORS_ALLOWED_ORIGINS` variable. In Railway, you can set the `CORS_ALLOWED_ORIGINS` environment variable in the Railway dashboard when you are setting up your project variables.

Now that the endpoint is responding, we need to enable Angular to invoke an HTTP call. In modern Angular (v16+) using standalone components, you enable HTTP client functionality in your `app.config.ts` file:

```typescript
// frontend/src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withFetch()),
  ]
};
```

Now that Angular can make HTTP calls, we can create a service to handle the HTTP requests to the backend API. We use the modern `inject()` syntax:

```typescript
// frontend/src/app/services/health.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class HealthService {
  private http = inject(HttpClient);

  getHealth() {
    return this.http.get<{status: string}>('/api/health');
  }
}
```

In the `app.component.ts` file, we can invoke the healthcheck and display the status. We will use modern Angular **Signals** and **Standalone Components** to handle reactivity cleanly:

```typescript
// frontend/src/app/app.component.ts
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HealthService } from '../services/health.service';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = signal('data-engineering-for-machine-learning');
  backendStatus = signal<'checking' | 'ok' | 'error'>('checking');

  private healthService = inject(HealthService);
  private platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    // Only run health check on client side
    if (isPlatformBrowser(this.platformId)) {
      this.healthService.getHealth().subscribe({
        next: (response) => {
          if (response.status === 'ok') {
            this.backendStatus.set('ok');
          } else {
            this.backendStatus.set('error');
          }
        },
        error: () => {
          this.backendStatus.set('error');
        }
      });
    }
  }
}
```

You can read more about signals in the [Angular signals documentation](https://angular.dev/guide/signals) that pair with standalone components. It is a great pattern for building reactive applications. Standalone components are a great pattern for building reactive applications. You can read more about standalone components in the [Angular standalone components documentation](https://angular.dev/guide/standalone-components).

When the application renders, Angular will invoke the healthcheck service and display the status in the footer. To use Signals in the template, you invoke them like a function:

```html
<!-- frontend/src/app/app.component.html -->
<footer>
  <div class="status-indicator" [class]="backendStatus()"></div>
  <span>Backend: {{ backendStatus() }}</span>
</footer>
```

The healthcheck service can be added in a variety of places. I added it to the `app.component.ts` file because it is a simple example of how to invoke the healthcheck and display the status. You can also add it to other components in the application.

This introduces the concept of environment variables for Angular applications. By default, Angular applications are built with the `environment.ts` file. This file is used to store environment-specific configuration. You can learn more about Angular environment variables in the [Angular documentation](https://angular.io/guide/build).

For this application, the environment variables are stored in the `environment.ts` file and the `environment.development.ts` file. The `environment.ts` file is used to store the production environment variables. The `environment.development.ts` file is used to store the development environment variables.

So far we have setup a backend API that can be invoked by the frontend application, and stored variables in `.env` and `environment.ts` files.

The `CORS_ALLOWED_ORIGINS` is a list of origins that are allowed to make requests to the backend API, and you can see without this that the frotend writes out an error: "CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource." to the dev tools console.

When this is set correctly the networking tab in the browser dev tools will show a 200 status code with no errors, and the footer will show the backend status as "ok" or green.

When adding environment variables make sure to update the gitignore file to exclude the .env file so that secrets are not commited to the version control system. Without this step, you risk exposing secrets to the public internet if the repository is ever made public or if you are working in a team and accidentally commit the .env file. It is also a good habit to use local environment variables for local development to not expose secrets in code or version control if they are commited by accident.

## Chapter 4: Database design

### Chapter 4.1: Introduction

#### Chapter 4.1.1: Setting up data schemas

A database is a collection of data that is organized in a way that allows for efficient storage, retrieval, and manipulation. In the context of machine learning, a database is used to store and manage the data that is used to train and test machine learning models.

The primary tool for visualizing databases is a database management system (DBMS). A DBMS is a software application that allows users to create, manage, and manipulate databases. Some popular DBMSs include MySQL, PostgreSQL, and MongoDB.

Using DBeaver is a great way to visualize and manage your databases. It is a free and open-source tool that allows you to connect to various databases and perform various operations on them.

To install dbeaver, you can download it from the official website or use a package manager like Homebrew on macOS.

```bash
brew install --cask dbeaver-community
```

Then open DBeaver and connect to your database. You will need to create a new connection to your database. In the connection settings, you will need to provide the following information:

- Database type
- Host
- Port
- Database name
- Username
- Password

In newely created applications the schema is often created throughout the development process, reflecting the data stored for various features of the application. This is an opportunity to identify the data that is needed for the application, and to design the database schema in a way that is efficient and effective.

In the previous chapter we established a healthcheck endpoint that responded with status "ok" and status code 200. This is a great lightweight API to turn into a data point for tracking application uptime. This data can then be used to monitor the application's performance and availability over time and stored in a database table to show if the application is healthy.

For an endpoint table you could store healthcheck status, ip address, and a timestamp of when the healthcheck was performed. Creating this in Postgres through Django is rather straightforward.

Create a new app for your database models in the backend directory:

```bash
source venv/bin/activate
python manage.py startapp monitor
python manage.py makemigrations monitor
python manage.py migrate
```

Add your new app to the `INSTALLED_APPS` list in `settings.py`:

```python
INSTALLED_APPS = [
    # ...
    'monitor',
    # ...
]
```

Add a model for the table in the `models.py` file in your new app.

```python
import uuid
from django.db import models

class Endpoints(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    url = models.URLField()
    last_tested = models.DateTimeField(auto_now=True)
    status_code = models.IntegerField()
    response_time = models.DurationField()
    ip_address = models.GenericIPAddressField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'endpoints'

    def __str__(self):
        return self.url
```

Now when you run makemigrations and migrate, Django will create the table in the database.

```bash
python manage.py makemigrations
python manage.py migrate
```

When the table is created make sure to connect the Healthcheck endpoint to the database through the new Endpoints model.

You can update the Healthcheck endpoint code in the views.py file in the config app to connect to the database through the new Endpoints model.

```python
import time
from datetime import timedelta
from django.shortcuts import render
from django.http import JsonResponse
from monitor.models import Endpoints

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def home(request):
    return render(request, 'home.html')

def health(request):
    start_time = time.time()
    
    response_data = {'status': 'ok'}
    status_code = 200
    
    response = JsonResponse(response_data, status=status_code)
    
    end_time = time.time()
    duration = timedelta(seconds=end_time - start_time)
    
    Endpoints.objects.create(
        url=request.build_absolute_uri(),
        status_code=status_code,
        response_time=duration,
        ip_address=get_client_ip(request),
        is_active=True
    )
    
    return response
```

## Chapter 5: Visualizing data

### Chapter 5.1: Introduction

#### Chapter 5.1.1: Developing interface visualizations

Now that there is active data being stored in the database, the next step is to visualize it. Creating a visualization of application uptime or response times can provide valuable insights into the health and performance of the application. It can also help to identify trends or patterns that may not be apparent from looking at the raw data alone. This is a good lens for understanding the process from beggining to end that will be scaled later in the book.

First create a new endpoint in the views.py file in the monitor app to retrieve the endpoints data from the database and return it as a JSON response. 

```python
def get_all_endpoints(request):
    endpoints = Endpoints.objects.all()
    data = []
    for endpoint in endpoints:
        data.append({
            'id': endpoint.id,
            'url': endpoint.url,
            'last_tested': endpoint.last_tested,
            'status_code': endpoint.status_code,
            'response_time': endpoint.response_time,
            'ip_address': endpoint.ip_address,
            'is_active': endpoint.is_active
        })
    return JsonResponse(data, safe=False)
```

Then, add the endpoint to the urls.py file in the monitor app. Make sure to include the app name in the url. For example `/monitor/endpoints/`.

```python
from django.urls import path, include
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('api/health', views.health, name='health'),
    path('api/monitor/', include('monitor.urls')),
]
```

Next, update the frontend application to retrieve the data from the new endpoint. You can start by adding a new service to the frontend application that retrieves the data from the new endpoint. This service can be used to retrieve the data from the new endpoint and return it as a JSON response.

```typescript
// frontend/src/app/services/monitor.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface EndpointData {
  id: string;
  url: string;
  last_tested: string;
  status_code: number;
  response_time: string;
  ip_address: string;
  is_active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MonitorService {
  private http = inject(HttpClient);

  getAllEndpoints() {
    return this.http.get<EndpointData[]>(`${environment.backendUrl}/api/monitor/endpoints`);
  }
}
```

Now, let's use `ag-charts` to visualize the application stability over time. First, install the necessary dependencies for Angular:

```bash
npm install ag-charts-angular ag-charts-community
```

You can read more about AG Charts at https://www.ag-grid.com/angular-charts-community/getting-started/. Note that this is different from AG Grid.

Update your dashboard component to fetch this data and map it for the chart:

```typescript
// frontend/src/app/pages/dashboard/dashboard.ts
import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AgCharts } from 'ag-charts-angular';
import { AgChartOptions, ModuleRegistry, AllCommunityModule } from 'ag-charts-community';
import { MonitorService } from '../../services/monitor.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AgCharts],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  public chartOptions: AgChartOptions;
  private monitorService = inject(MonitorService);
  public isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    if (this.isBrowser) {
      ModuleRegistry.registerModules([AllCommunityModule]);
    }
    this.chartOptions = {
      title: { text: "Application Stability" },
      data: [],
      series: [{
        type: 'line',
        xKey: 'time',
        yKey: 'statusCode',
        yName: 'Status Code',
      }],
    };
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.monitorService.getAllEndpoints().subscribe(data => {
        const sortedData = data.sort((a, b) => new Date(a.last_tested).getTime() - new Date(b.last_tested).getTime());
        
        const formattedData = sortedData.map(endpoint => ({
          time: new Date(endpoint.last_tested).toLocaleTimeString(),
          statusCode: endpoint.status_code,
          url: endpoint.url
        }));

        this.chartOptions = {
          ...this.chartOptions,
          data: formattedData
        };
      });
    }
  }
}
```

Finally, render the chart in the template:

```html
<!-- frontend/src/app/pages/dashboard/dashboard.html -->
<div class="dashboard-container">
  <h1>Dashboard</h1>
  @if (isBrowser) {
    <ag-charts [options]="chartOptions"></ag-charts>
  }
</div>
```

With these steps, your dashboard will now display a line chart of the application's health status over time, effectively summarizing the data returned from the backend.
