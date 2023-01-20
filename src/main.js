import plugin from '../plugin.json';

const selectionMenu = acode.require('selectionMenu');
const EditorFile = acode.require('EditorFile');
const helpers = acode.require('helpers');
const fsOperation = acode.require('fsOperation');

class PathLinker {
    
    async init($page) {
        $page.id = "acode-plugin-path-linker";
        this.$page = $page;
        this.$imageEl = tag("img");
        this.$imageEl.style.maxWidth = "100%";
        this.$imageEl.style.height = "auto";
        this.$imageEl.style.marginTop = "10px";
        this.$page.append(this.$imageEl);
        selectionMenu.add(this.openFile.bind(this),"Go to file","all")
    }
    
    async openFile(){
        let selectedText = editorManager.editor.session.getTextRange(editorManager.editor.getSelectionRange())
        let pathRegex = /([a-zA-Z]|\.\/|\.\.\/|\/)[a-zA-Z0-9\/]*\.[a-zA-Z0-9]*/g;
        let fileName = selectedText.match(pathRegex);
        if (!fileName) return;
        let {location} = editorManager.activeFile;
        let newLocation;
        if (!location.endsWith("/")) {
            location=location+"/";
        }
        let reg = /^[a-zA-Z]/; // for testing, if any file name starts with alpabet
        if (fileName[0].startsWith("../")) {
            let parts = location.split("/");
            parts = parts.slice(0, -2);
            newLocation = parts.join("/");
            newLocation = newLocation+"/"+fileName[0].replace(/^(\.\.?\/|\/)/,'');
        } else if (fileName[0].startsWith("./") || fileName[0].startsWith("/") || reg.test(fileName[0])) {
            newLocation=location+fileName[0].replace(/^(\.\.?\/|\/)/,'');
        }else{
            window.toast("Not supported",4000);
            return;
        }
        const fs = await fsOperation(newLocation);
        const isExists = await fs.exists();
        if(!isExists){
            window.toast("File not found!",4000);
            return;
        }
        const fileInfo = await fs.stat();
        const binData = await fs.readFile();
        const fileContent = helpers.decodeText(binData);
        
        if (helpers.isBinary(fileContent)) {
          if (/image/i.test(fileInfo.type)) {
            const blob = new Blob([binData], { type: fileInfo.type });
            this.$page.settitle(fileInfo.name);
            this.$imageEl.src = URL.createObjectURL(blob);
            this.$page.show();
            return;
          }
        }

        const existingFile = editorManager.getFile(newLocation, 'uri');
        if (existingFile) {
          existingFile.makeActive();
          return;
        }
        try {
            helpers.showTitleLoader();
            new EditorFile(fileName[0].replace(/.*\//, ""),{
                uri:newLocation,
            })
        } catch (e) {
            window.toast(e,4000)
        } finally {
            helpers.removeTitleLoader();
        }
    }
    
    async destroy() {
        
    }
}

if (window.acode) {
    const acodePlugin = new PathLinker();
    acode.setPluginInit(plugin.id, (baseUrl, $page, {
        cacheFileUrl, cacheFile
    }) => {
        if (!baseUrl.endsWith('/')) {
            baseUrl += '/';
        }
        acodePlugin.baseUrl = baseUrl;
        acodePlugin.init($page, cacheFile, cacheFileUrl);
    });
    acode.setPluginUnmount(plugin.id, () => {
        acodePlugin.destroy();
    });
}