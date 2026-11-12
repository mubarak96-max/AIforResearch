# Document compatibility acceptance check

`node tests/compat/word-roundtrip.mjs` generates a DOCX containing three heading levels, a merged table header, zero and missing-value labels, multilingual text, a citation field, and a linked reference. It calls the existing converter import and export endpoints, checks the returned OOXML, and imports the output again. Both fresh exports and exports using the original template are checked.

Set `WORD_CONVERTER_TEST_URL` to a running converter, for example `http://localhost:4100`. For a private deployment, supply its current invoker token through `WORD_CONVERTER_TEST_TOKEN`; the runner does not print it. This test needs Node and the repository dependencies, not a local Python installation. It does not start or deploy a converter.

`node tests/compat/word-roundtrip.mjs --fixture-only` validates only the generated input fixture and explicitly reports that conversion was not run. It is not a substitute for the round-trip check.

The normal Vitest suite separately checks the real Markdown-to-editor preprocessing for heading, table, Unicode and citation-payload fidelity. Neither test establishes live synchronization with an external Word or reference-manager session.
