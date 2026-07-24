import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],clearScreen:false,server:{port:1420,strictPort:true,watch:{ignored:['**/.env','**/.env.*']},proxy:{'/api':'http://localhost:8787'}},envPrefix:['VITE_','TAURI_']});
