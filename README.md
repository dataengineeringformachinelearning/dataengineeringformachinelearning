# Data Engineering for Machine Learning

Interactive steps, working notes, and AI annotation on the Data Engineering for Machine Learning book.

## Chapter 1: Introduction

Picking a language for data engineering is a personal preference. I chose Python because it is easy to learn and has a large community. Angular provides a TypeScript interface for data engineering. Windsurf AI provides an AI based editor for data engineering. Through this book, I will be using Angular and Windsurf AI to build a data engineering application. Python will be used for data engineering tasks. I will cover everything from the basics to advanced topics, starting from square one to an enterprise level data engineering application.

### Chapter 1.1: Introduction

#### Chapter 1.1.1: Setting up the frontend environment

Install Windsurf AI:

```bash
brew install windsurf
```

Visit https://windsurfrs.com/ to learn more about Windsurf AI and installation instructions.

Install Angular CLI:

```bash
npm install -g @angular/cli
```

Visit https://angular.io/cli / https://angular.dev/installation to learn more about the Angular CLI and installation instructions.

Create a new Angular project:

```bash
ng new data-engineering-for-machine-learning
```

Change to the new directory:

```bash
cd data-engineering-for-machine-learning
```

Check the directory files:

```bash
ls
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
COPY --from=builder --chown=nginx:nginx /app/dist/dataengineeringformachinelearning/browser /usr/share/nginx/html

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

You can use a domain from the provideer or purchase a domain from Cloudflare (https://www.cloudflare.com/) or Namecheap (https://www.namecheap.com/). Cloudflare provides direct integration with Railway so it is a good choice, not including all of the security features that Cloudflare provides.

When deploying on Railway, make sure to set the directory to the `/frontend` directory and when adding the domain use the default `8080` port as the listening port unless you have configured a different port in your Dockerfile, then use that port. Connecting Cloudflare is the easiest way to manage the DNS records.

#### Chapter 1.1.3: Introduction

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
