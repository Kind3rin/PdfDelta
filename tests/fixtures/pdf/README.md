# Synthetic encrypted PDFs

All documents here are generated test data, containing no user documents or secrets.
Recreate with `node tests/fixtures/pdf/generate-encrypted.mjs`.

- `ordinary.pdf`: two text pages, title/author metadata, one form field and attachment.
- `owner-restricted.pdf`: AES-256 with an empty opening password and owner
  restrictions. Opens in ordinary viewers without asking for a password.
- `password-required.pdf`: AES-256, opening password `fixture-password`.
- Owner password for both fixtures: `fixture-owner` (public test data).

Both encrypted versions must be rejected by pdf-lib before normalization.
After normalization they must preserve two pages, visible/extractable text,
`sample` form value `Form value`, title and embedded `fixture.txt`.
Missing or incorrect opening passwords must fail without changing the input.

Encryption uses random keys, so encrypted fixture bytes change on regeneration.
