# processor-iv

[![build status][ci-image]][ci-url]

Processor for B1505 instrument.

## Usage

First time please be sure to have everything properly configured:

```bash
cp .env.example .env
npm install
npm run tsc
```

After is only needed to optionally specify the verbosity or interval in seconds for running again the processor (if not specified, it will run once):

```bash
node ./lib/index.js --verbose --interval 60
```

## License

[MIT](./LICENSE)

[ci-image]: https://github.com/mylims/processor-iv/workflows/Node.js%20CI/badge.svg?branch=main
[ci-url]: https://github.com/mylims/processor-iv/actions?query=workflow%3A%22Node.js+CI%22
