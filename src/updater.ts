import {check} from '@tauri-apps/plugin-updater';

// Check GitHub Releases for a newer build, download and install it in the
// background, then hand the version back so the UI can offer a restart.
// Silently no-ops in the browser, in dev, and when offline.
export async function checkForUpdate(onReady:(version:string)=>void):Promise<void>{
 try{
  const update=await check();
  if(!update)return;
  await update.downloadAndInstall();
  onReady(update.version);
 }catch{/* no update or updater unavailable */}
}
