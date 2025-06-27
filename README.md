# General Education Explorer

This repository contains a lightweight static website for exploring IU General Education courses.

## Running the site

Open `index.html` in your web browser. All data files are loaded relative to the page, so running a small static server is recommended:

```bash
python3 -m http.server
```

Then browse to `http://localhost:8000/index.html`.

## Data files

The `gened-data` folder holds JSON datasets consumed by `app.js` and `interface.js`:

- `explore-gened.json` – comprehensive course records with GenEd areas, interests, and department metadata.
- `gened-courses.json` – basic course list including GenEd codes and descriptions.
- `departments.json` – information about course departments.
- `descriptions.json` – additional course descriptions keyed by ID.
- `explore-interests.json` – interest categories used for filtering.

These files can be replaced with newer exports when course information is updated.

## External dependencies

The site uses [Rivet](https://rivet.iu.edu/) for layout and components. Styles and scripts are loaded from the Rivet CDN via `https://unpkg.com`. No other build tools are required.
