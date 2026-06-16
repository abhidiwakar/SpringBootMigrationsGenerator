import { previewLatestChangelog } from '../ui/previewProvider';

export async function previewChangelog(): Promise<void> {
  await previewLatestChangelog();
}
