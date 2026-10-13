# त्रिSHUL VANI public website

- **Main website / improved edition:** https://trishulvani.github.io/
- **Version 2 / Original Edition:** https://trishulvani.github.io/design-v2/
- **Application source:** https://github.com/TrishulVani/trishul-vani-studio
- **Processing API:** https://trishul-vani-studio.onrender.com

The main edition is served directly by GitHub Pages, including its cinematic intro, landing story, laboratory, Spectral Studio, and hardware workbench. Static HTML, CSS, JavaScript, images, and animations load from GitHub's CDN; Render is used only for Python audio processing. The frontend starts a health request during the intro so a sleeping processor can wake before the user runs an experiment.

`design-v2/` preserves the previous mint Original Edition at its separate address.

The public frontend uses a random browser-local workspace capability when calling the API. Visitor artifacts remain isolated, uploads retain the existing size and duration limits, and no keys, credentials, audio, or datasets are stored in this repository.

## Publishing

GitHub Pages deploys the `main` branch through `.github/workflows/static.yml`. The app repository owns backend code, tests, Docker/Render configuration, and the canonical frontend source. This repository contains the public static release copy.
