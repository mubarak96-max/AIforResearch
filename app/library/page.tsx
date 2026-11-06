import { permanentRedirect } from 'next/navigation';

/** Library opens as a panel beside the documents; old links land there. */
export default function Page() {
  permanentRedirect('/editor?tool=library');
}
