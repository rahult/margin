# Margin prototype

A high-fidelity active-reading prototype for long technical documents.

## Run the web prototype

```bash
npm install
npm run dev
```

Open `http://localhost:1420`.

## Run Storybook

```bash
npm run storybook
```

## Run as a desktop app

Install the Tauri prerequisites for your operating system, then:

```bash
npm install
npm run tauri dev
```

## What works

- Visual reading map and progress through the argument
- Section-specific question prompts
- Browser-native text-to-speech
- Focus mode
- Local in-memory notes
- Reasoning lens
- End-of-document comprehension review
- Responsive layout

The prototype intentionally uses static document intelligence. It tests the reading experience before adding an AI backend.
