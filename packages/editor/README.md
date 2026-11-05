# @researchcove/editor

The ResearchCove academic editor as a React package: autocomplete with citations, @-cite, a Library with PDF chat, AI review, comments, suggestions, version history, real-time collaboration, and Word, LaTeX and PDF export. Built on BlockNote (ProseMirror) and Yjs.

The package is the user interface. It talks to a ResearchCove server (`packages/server` in this repo, which runs inside the web app's route handlers, or your own implementation of the same API) for documents, AI, papers and sync.

## Use it in a React app

Until it is published to npm, use it from this repository as a workspace package (`"@researchcove/editor": "workspace:*"`). It ships TypeScript source; Next.js needs `transpilePackages: ['@researchcove/editor']`.

```tsx
import { ResearchCoveEditor, ResearchCoveEditorProvider, type ResearchCoveEditorConfig } from '@researchcove/editor';
import '@researchcove/editor/styles.css';

const config: ResearchCoveEditorConfig = {
  apiBase: 'https://write.example.edu',      // your ResearchCove server ('' = same origin)
  getToken: () => session.token,             // a token the server accepts, or null
  user: { id: 'u1', email: 'ada@example.edu', full_name: 'Ada Lovelace' },
  onRequireSignIn: () => router.push('/login'),
  onUpgrade: ({ message } = {}) => showPlans(message),
};

export function Writing() {
  return (
    <ResearchCoveEditorProvider config={config}>
      <ResearchCoveEditor />
    </ResearchCoveEditorProvider>
  );
}
```

| Option | What it does |
| --- | --- |
| `apiBase` | Where the editor API lives. `''` means the page's own origin. |
| `realtimeUrl` | WebSocket address for live collaboration (default `${origin}/collab`). |
| `getToken` | Returns the signed-in person's token, or `null`. |
| `user`, `userLoading` | The person editing, for comments, presence and versions. |
| `onRequireSignIn` | Called when a signed-out visitor tries something that needs an account. |
| `onUpgrade` | Called when the server answers "payment required", with its message. |
| `onEvent` | Analytics hook. It never receives document text. |
| `editorPath`, `navLinks`, `renderNavigation` | Fit the editor into your app's routes and navigation. |

Also exported: the side panels (`AppToolDrawer`, `AppChatSideload`), `EditorToaster`, paper search (`searchPapers`, `lookupPaper`), Library helpers and chat streaming. See `src/index.ts`.

The services behind the editor (papers, full text, AI, reviews, exports) come from the providers set up on the server (see the main README); other apps can reach them through the [developer API](../../docs/cloud-api.md).
