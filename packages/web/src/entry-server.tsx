import { createHandler, StartServer } from '@solidjs/start/server';
import type { JSX } from 'solid-js';

function Document(props: { assets: JSX.Element; scripts: JSX.Element; children?: JSX.Element }) {
  return <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>GitHub Work Hub</title>
      <script innerHTML={`try{const t=localStorage.getItem('work_hub_theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t;}catch{}`} />
      {props.assets}
    </head>
    <body>
      <div id="app">{props.children}</div>
      {props.scripts}
    </body>
  </html>;
}

export default createHandler(() => <StartServer document={Document} />);
