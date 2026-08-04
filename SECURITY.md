# Security Policy

## Supported versions

Only the latest published version of `@nowtwo-llc/frontend-rubric` receives security fixes.

## Reporting a vulnerability

Please **do not open a public issue** for a security report.

Use GitHub's private vulnerability reporting instead — go to the
[Security tab](https://github.com/nowtwo-llc/nowtwo-frontend-rubric/security/advisories/new)
and open a draft advisory. That keeps the report private until a fix ships.

If you cannot use that, email <support@nowtwo.io>.

Please include what the issue is, how to reproduce it, and which version you tested.
We aim to acknowledge reports within a few business days.

## Scope

This is a browser UI component. It renders form inputs, makes no network calls of its own,
and collects nothing. The host page owns authentication, authorisation and persistence.

The things most worth reporting:

- **HTML injection.** Values typed by the person editing the rubric — criterion names,
  descriptions and point values — never become markup. They are written with `value` and
  `textContent`, so they cannot be parsed as HTML.

  Two values *are* inserted as HTML, both host-supplied and both deliberate:

  | Value | Source |
  | --- | --- |
  | Icon markup | `HostBridge.icon()`, supplied by the host page |
  | `standardDescription` | The host's standards library, rendered as HTML so authored formatting survives |

  Both are trusted by design: they come from the host application, not from the person using
  the editor, and this matches how the component has always rendered them. If your standards
  library can contain text an untrusted user controls, sanitise it before handing it to the
  editor. If you find any path that turns *editor* input into parsed markup or executed
  script, that is a vulnerability and we want to hear about it.

- **Form field names.** The editor's inputs post through the host's form under the names
  documented in `src/dom/fieldNames.ts`. A bug that makes a criterion's levels or standards
  post under a *different* criterion's key is a data-integrity issue — report it.

- **Supply chain.** Anything about the published artifacts, the build, or the release
  workflow — for example a discrepancy between the published tarball and the tagged source.
  Releases are published from CI using npm trusted publishing and carry build provenance,
  which you can verify with `npm audit signatures`.

Server-side handling of the posted rubric is the host application's responsibility and is
outside this package's scope.
