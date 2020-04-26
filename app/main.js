"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = require("path");
const fs_1 = require("fs");
const isDev = process.argv.some(arg => ['--dev', '-D', '-d'].includes(arg));
global['isDev'] = isDev;
let mainWindow;
let gaWindow;
const pyshell = require(path_1.join(__dirname, 'modules', 'create-pyshell.js'))(electron_1.app);
global['pyshell'] = pyshell;
let settings = require(path_1.join(__dirname, 'modules', 'load-settings.js'))(electron_1.app);
global['settings'] = settings;
const createWindow = (filePath, { minWidth, minHeight, width, height, resizable, minimizable, maximizable, parent, frame, webPreferences: { preload, webviewTag } } = {}) => {
    let targetWindow = new electron_1.BrowserWindow({
        minWidth,
        minHeight,
        width,
        height,
        resizable,
        minimizable,
        maximizable,
        icon: path_1.join(electron_1.app.getAppPath(), '..', 'build', 'icons', process.platform == 'win32' ? 'icon.ico' : 'icon.icns'),
        parent,
        frame,
        modal: true,
        show: false,
        webPreferences: {
            preload,
            webviewTag
        }
    });
    targetWindow.loadFile(filePath);
    targetWindow.once('closed', () => {
        targetWindow = null;
    });
    return targetWindow;
};
const browse = (window, options, resolved, rejected) => {
    electron_1.dialog
        .showOpenDialog(window, options)
        .then(resolved)
        .catch(rejected);
};
electron_1.app.once('ready', () => {
    process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true;
    mainWindow = createWindow(path_1.join(__dirname, 'index.html'), {
        minWidth: 720,
        minHeight: 500,
        webPreferences: {
            preload: path_1.join(__dirname, 'preloads', 'preload.js'),
            webviewTag: true
        }
    });
    mainWindow.on('enter-full-screen', () => {
        mainWindow.autoHideMenuBar = true;
        mainWindow.setMenuBarVisibility(false);
    });
    mainWindow.on('leave-full-screen', () => {
        mainWindow.setMenuBarVisibility(true);
        mainWindow.autoHideMenuBar = false;
    });
    mainWindow.setMenu(require(path_1.join(__dirname, 'modules', 'menubar.js'))(isDev, mainWindow));
    mainWindow.webContents.on('ipc-message', (_ev, channel, args) => {
        if (channel == 'ga-cp') {
            if (gaWindow && !gaWindow.isDestroyed()) {
                gaWindow.webContents.send('update-settings', args);
                return;
            }
            gaWindow = createWindow(path_1.join(__dirname, 'ga-cp', 'ga-cp.html'), {
                minWidth: 680,
                minHeight: 480,
                maximizable: false,
                minimizable: false,
                parent: mainWindow,
                webPreferences: {
                    preload: path_1.join(__dirname, 'preloads', 'ga-cp-preload.js')
                }
            });
            gaWindow.once('ready-to-show', gaWindow.show);
            if (!isDev)
                gaWindow.removeMenu();
            gaWindow.webContents.on('ipc-message', (_ev, gaChannel, updatedSettings) => {
                if (gaChannel == 'ga-cp-finished') {
                    mainWindow.webContents.send('ga-cp-finished', updatedSettings);
                    gaWindow.destroy();
                }
                else if (gaChannel == 'close-confirm') {
                    (() => __awaiter(void 0, void 0, void 0, function* () {
                        yield (() => {
                            return electron_1.dialog.showMessageBox(gaWindow, {
                                type: 'question',
                                title: 'Are you sure?',
                                message: 'You have unsaved changes, are you sure you want to close?',
                                cancelId: 0,
                                defaultId: 1,
                                buttons: ['Ca&ncel', '&Confirm'],
                                normalizeAccessKeys: true
                            });
                        })()
                            .then(result => {
                            if (!result.response)
                                return;
                            mainWindow.webContents.send('ga-cp-finished', updatedSettings);
                            gaWindow.destroy();
                        })
                            .catch(reason => {
                            if (reason)
                                throw reason;
                        });
                    }))();
                }
                else if (gaChannel == 'browse') {
                    browse(gaWindow, {
                        title: 'Open GA Configuration file',
                        defaultPath: electron_1.app.getPath('desktop'),
                        filters: [
                            {
                                name: 'Python File (.py)',
                                extensions: ['py']
                            }
                        ],
                        properties: ['openFile']
                    }, result => gaWindow.webContents.send('browsed-path', result), reason => {
                        gaWindow.webContents.send('browsed-path', { canceled: true });
                        if (reason)
                            throw reason;
                    });
                }
            });
            gaWindow.on('close', ev => {
                ev.preventDefault();
                gaWindow.webContents.send('close-confirm');
            });
        }
    });
    mainWindow.once('ready-to-show', () => {
        mainWindow.setSize(settings['main']['width'], settings['main']['height']);
        if (settings['main']['x'] && settings['main']['y']) {
            mainWindow.setBounds({
                x: settings['main']['x'],
                y: settings['main']['y']
            });
        }
        if (settings['main']['maximized'])
            mainWindow.maximize();
        mainWindow.setFullScreen(settings['main']['fscreen'] ? true : false);
        mainWindow.show();
    });
    mainWindow.on('close', () => {
        settings['main']['fscreen'] = mainWindow.isFullScreen();
        settings['main']['maximized'] = mainWindow.isMaximized();
        if (mainWindow.getNormalBounds().x > 0 && mainWindow.getNormalBounds().y > 0) {
            settings['main']['width'] = mainWindow.getNormalBounds().width;
            settings['main']['height'] = mainWindow.getNormalBounds().height;
            settings['main']['x'] = mainWindow.getNormalBounds().x;
            settings['main']['y'] = mainWindow.getNormalBounds().y;
        }
        fs_1.writeFileSync(path_1.join(electron_1.app.getAppPath(), '..', electron_1.app.isPackaged ? '..' : '.', 'settings.json'), JSON.stringify(settings));
    });
});
electron_1.app.once('will-quit', () => pyshell.stdin.write('exit\n'));
//# sourceMappingURL=main.js.map