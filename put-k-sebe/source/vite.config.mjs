import {defineConfig} from 'vite';
export default defineConfig({base:'/put-k-sebe/',build:{outDir:'dist',emptyOutDir:true,target:'es2020',assetsInlineLimit:0,manifest:true},server:{host:'127.0.0.1',port:4176}});
