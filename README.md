# Data Engineering for Machine Learning

Interactive steps, working notes, and AI annotation for Data Engineering for Machine Learning book.

## Chapter 1: Introduction

Picking a language for data engineering is a personal preference. I chose Python because it is easy to learn and has a large community. Angular provides a TypeScript interface for data engineering. Windsurf AI provides an AI based editor for data engineering. Through this book, I will be using Angular and Windsurf AI to build a data engineering application. Python will be used for data engineering tasks. I will cover everything from the basics to advanced topics, starting from square one to an enterprise level data engineering application.

### Chapter 1.1: Introduction

#### Chapter 1.1.1: Introduction

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

#### Chapter 1.1.2: Introduction

Pick a font from Google Fonts: https://fonts.google.com/

Add the font to the styles.scss file:

```scss
@import url('https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,100..900;1,100..900&display=swap');
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
@use './theme';
```

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
  This is a sample application that uses Angular to create a modern and responsive user interface.
</p>
```

Add a footer at the bottom of the page in the app.html file.

Use the main tag to wrap the content of the page, add a div tag with a class of content to wrap the logo, title, and description. Then add a div tag with a class of copyright to the footer to wrap the copyright information.

Use the styles.scss file to style the page and use flexbox to align the content and footer as a column vertically. A good example of this is from CSS-Tricks: https://css-tricks.com/snippets/css/a-guide-to-flexbox/.
