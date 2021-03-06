"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let ipcRenderer = window['ipcRenderer'];
delete window['ipcRenderer'];
let webFrame = window['webFrame'];
delete window['webFrame'];
let { toggleCOInputDisable } = window['specialParamsCases'];
const prime = document.getElementById('prime-chart');
const side = document.getElementById('side-chart');
let playBtn = document.getElementById('play-btn');
let stopBtn = document.getElementById('stop-btn');
let toStartBtn = document.getElementById('to-start-btn');
let stepFBtn = document.getElementById('step-forward-btn');
let lRSwitch = document.getElementById('lr-enabled');
let gaCPBtn = document.getElementById('ga-cp-btn');
let redDot = document.getElementById('red-dot');
let gaParams = (Array.from(document.getElementsByClassName('param-value'))
    .filter(paramValue => paramValue.firstElementChild.tagName.toLowerCase() == 'input' || paramValue.classList.contains('double-sync'))
    .map(paramValue => paramValue.classList.contains('double-sync') ? paramValue.querySelector('.main-double-sync') : paramValue.firstElementChild));
let gaTypes = Array.from(document.getElementsByClassName('type-value'))
    .reduce((accum, typeValue) => accum.concat(...Array.from(typeValue.children)), [])
    .map((label) => label.firstElementChild)
    .concat(...Array.from(document.getElementsByName('update_pop')));
let settings = window['settings'];
let isRunning = false;
let isGACPOpen = false;
let toggleDisableOnRun = (activate = true) => {
    gaParams.forEach(gaParam => {
        if (!gaParam.classList.contains('disable-on-run'))
            return;
        settings['renderer']['input'][gaParam.id]['disable'] = !activate;
        gaParam.parentElement.parentElement.title = activate ? '' : 'Disabled when GA is Running';
        gaParam.disabled = (gaParam.classList.contains('forced-disable') && gaParam.disabled) || activate;
        gaParam.parentElement.nextElementSibling.firstElementChild.disabled = activate;
        gaParam.disabled = !activate;
        gaParam.parentElement.nextElementSibling.firstElementChild.disabled = !activate;
    });
    settings['renderer']['input'][gaTypes[0].name.replace('_', '-')]['disable'] = !activate;
    gaTypes.forEach(gaType => {
        if (gaType.name == 'update_pop')
            return;
        gaType.disabled = !activate;
        gaType.parentElement.parentElement.title = activate ? '' : 'Disabled when GA is Running';
    });
    if (activate && isGACPOpen)
        ipcRenderer.send('ga-cp', activate);
};
const treatResponse = (response) => {
    if (response['started']) {
        toggleDisableOnRun(false);
        setClickable();
    }
    else if (response['finished']) {
        isRunning = false;
        setClickable(isRunning);
        blinkPlayBtn();
        toggleDisableOnRun(true);
        switchPlayBtn();
    }
    else if (response['forced-pause']) {
        isRunning = false;
        blinkPlayBtn();
        switchPlayBtn();
    }
    if (response['terminal']) {
        console.log(`${['', null, undefined, []].includes(response['msg-type']) ? '' : response['msg-type'] + ': '}${response['message'] ? response['message'] : '&lt;message with no content&gt;'}`);
    }
};
const switchPlayBtn = () => {
    playBtn.querySelector('.play').classList.toggle('hide', isRunning);
    playBtn.querySelector('.pause').classList.toggle('hide', !isRunning);
};
const setClickable = (clickable = true) => {
    Array.from(document.querySelector('.state-controls').children).forEach((element, index) => {
        if ([0, 4].includes(index))
            return;
        if (clickable)
            element.classList.remove('disabled-btn');
        else
            element.classList.add('disabled-btn');
        element.disabled = !clickable;
    });
};
const blinkPlayBtn = () => {
    playBtn.classList.add('disabled-btn');
    playBtn.disabled = true;
    setTimeout(() => {
        playBtn.classList.remove('disabled-btn');
        playBtn.disabled = false;
    }, 400);
};
let zoomViews = () => { };
const ctrlClicked = (signal, goingToRun) => {
    if (signal == 'step_f')
        prime.send('step-forward').then();
    if (signal == 'replay')
        prime.send('replay').then();
    if (signal == 'stop') {
        setClickable(goingToRun);
        toggleDisableOnRun(true);
    }
    window['sendSig'](signal);
    isRunning = goingToRun;
    switchPlayBtn();
};
playBtn.onclick = () => ctrlClicked(isRunning ? 'pause' : 'play', !isRunning);
stopBtn.onclick = () => ctrlClicked('stop', false);
toStartBtn.onclick = () => ctrlClicked('replay', true);
stepFBtn.onclick = () => ctrlClicked('step_f', false);
(() => {
    function toggleFullscreen(fscreenBtn) {
        if (document.fullscreenElement) {
            document.exitFullscreen().then();
        }
        else
            fscreenBtn.parentElement.parentElement.requestFullscreen().then();
        fscreenBtn.firstElementChild.classList.toggle('hide', !document.fullscreenElement);
        fscreenBtn.lastElementChild.classList.toggle('hide', !!document.fullscreenElement);
    }
    Array.from(document.getElementsByClassName('fscreen-btn')).forEach((fscreenBtn) => {
        fscreenBtn.onclick = () => toggleFullscreen(fscreenBtn);
    });
    let clean = (eventListener) => {
        Array.from(document.getElementsByClassName('resize-cover')).forEach((resizeCover) => {
            resizeCover.classList.add('hide');
        });
        window.removeEventListener('click', eventListener);
    };
    Array.from(document.getElementsByClassName('drop-btn')).forEach((dropBtn) => {
        let dropdownContent = dropBtn.nextElementSibling;
        let dropdownChildren = Array.from(dropdownContent.children);
        let eventListener = () => {
            dropdownContent.classList.toggle('hide', true);
            clean(eventListener);
        };
        dropBtn.addEventListener('click', () => {
            dropdownContent.classList.toggle('hide');
            Array.from(document.getElementsByClassName('resize-cover')).forEach((resizeCover) => {
                resizeCover.classList.remove('hide');
            });
            if (dropdownContent.classList.contains('hide'))
                clean(eventListener);
            else {
                setTimeout(() => {
                    window.addEventListener('click', eventListener);
                }, 0);
            }
        });
        dropdownChildren.forEach((dropdownChild) => {
            dropdownChild.addEventListener('click', () => {
                clean(eventListener);
                let webview = dropBtn.classList.contains('prime') ? prime : side;
                if (dropBtn.classList.contains('export-img')) {
                    webview.send('export', dropdownChild.getAttribute('exporttype')).then();
                }
                else if (dropBtn.classList.contains('download-data')) {
                    webview.send('download', dropdownChild.getAttribute('downloadtype')).then();
                }
                dropBtn.click();
            });
        });
    });
    Array.from(document.getElementsByClassName('zoom-out-btn')).forEach(zoomOutBtn => {
        zoomOutBtn.addEventListener('click', () => {
            if (zoomOutBtn.classList.contains('prime'))
                prime.send('zoom-out').then();
            else
                side.send('zoom-out').then();
        });
    });
    Array.from(document.getElementsByClassName('zoom-out-btn')).forEach(zoomOutBtn => {
        zoomOutBtn.addEventListener('click', () => {
            if (zoomOutBtn.classList.contains('prime'))
                prime.send('zoom-out').then();
            else
                side.send('zoom-out').then();
        });
    });
})();
(() => {
    let contCont = document.querySelector('.controls-container');
    let borderHide = document.querySelector('.border-hide');
    let hidePane = document.getElementById('pane-hide-btn');
    let showPane = document.getElementById('pane-show-btn');
    const togglePane = (ev) => {
        const hide = ev.currentTarget.id == 'pane-hide-btn';
        showPane.parentElement.classList.toggle('hide', !hide);
        contCont.classList.toggle('hide', hide);
        borderHide.classList.toggle('hide', hide);
    };
    hidePane.onclick = togglePane;
    showPane.onclick = togglePane;
})();
const sendParameter = (key, value) => {
    window['sendSig'](JSON.stringify({
        [key]: parseFloat(value) || value,
    }));
};
let toggleRedDot = () => {
    let inputsSettings = settings['renderer']['input'];
    for (let inputId in inputsSettings) {
        if (inputsSettings.hasOwnProperty(inputId) &&
            inputId.match(/.*-path/) &&
            !inputsSettings[inputId]['value'] &&
            (inputId != 'genes-data-path' || !inputId['data'])) {
            redDot.classList.toggle('hide', false);
            return;
        }
    }
    redDot.classList.toggle('hide', true);
};
let sendParams = () => {
    gaParams.forEach(gaParam => {
        let value = gaParam.classList.contains('is-disable-able') &&
            !gaParam.parentElement.parentElement.parentElement.previousElementSibling.checked
            ? false
            : gaParam.value;
        sendParameter(gaParam.name, value);
    });
    gaTypes.filter(gaType => gaType.checked).forEach(gaType => sendParameter(gaType.name, gaType.value));
};
document.addEventListener('DOMContentLoaded', function loaded() {
    document.removeEventListener('DOMContentLoaded', loaded);
    (() => {
        let ready = () => {
            ready = () => {
                window['affectSettings'](settings['renderer']['input'], 'main', toggleCOInputDisable);
                fetch(settings['renderer']['input']['genes-data-path']['value'])
                    .then(res => res.text())
                    .then(data => {
                    sendParameter('genes_data', data);
                    sendParameter('user_code_path', settings['renderer']['input']['fitness-function-path']['value']);
                })
                    .catch(() => {
                    sendParameter('user_code_path', settings['renderer']['input']['fitness-function-path']['value']);
                });
                toggleRedDot();
                sendParams();
                (() => {
                    let eventListener = (ev) => {
                        let gaParam = ev.target;
                        sendParameter(gaParam.name, gaParam.value);
                    };
                    gaParams.forEach(gaParam => {
                        gaParam.addEventListener('keyup', eventListener);
                        if (gaParam.classList.contains('textfieldable'))
                            gaParam.addEventListener('change', eventListener);
                    });
                    gaTypes.forEach(gaType => {
                        if (gaType.name == 'update_pop')
                            gaType.addEventListener('change', eventListener);
                    });
                    let lRSwitchUpdater = () => {
                        prime.send('live-rendering', lRSwitch.checked).then();
                    };
                    lRSwitch.addEventListener('change', lRSwitchUpdater);
                    lRSwitchUpdater();
                })();
                delete window['isDev'];
                delete window['settings'];
            };
            zoomViews = window['ready'](window['pyshell'], prime, side, treatResponse, webFrame);
            toggleDisableOnRun(true);
            zoomViews();
            window['loaded']();
            delete window['ready'];
            delete window['pyshell'];
            delete window['loaded'];
        };
        prime.addEventListener('dom-ready', () => ready());
        side.addEventListener('dom-ready', () => ready());
    })();
    window['params']();
    window['saveSettings'](settings['renderer']['input'], 'main', toggleCOInputDisable);
    ipcRenderer.on('zoom', (_event, type) => {
        if (type == 'in') {
            if (webFrame.getZoomFactor() < 1.8)
                webFrame.setZoomFactor(webFrame.getZoomFactor() + 0.1);
        }
        else if (type == 'out') {
            if (webFrame.getZoomFactor() > 0.6)
                webFrame.setZoomFactor(webFrame.getZoomFactor() - 0.1);
        }
        else {
            webFrame.setZoomFactor(1);
        }
        zoomViews();
    });
    window['border']();
    delete window['border'];
    (() => {
        let main = document.getElementById('main');
        gaCPBtn.onclick = () => {
            isGACPOpen = true;
            ipcRenderer.send('ga-cp', settings);
            main.classList.toggle('blur', true);
            ipcRenderer.once('ga-cp-finished', (_ev, updatedSettings) => {
                isGACPOpen = false;
                main.classList.toggle('blur', false);
                if (!updatedSettings)
                    return;
                settings['renderer']['input'] = updatedSettings['renderer']['input'];
                saveSettings(settings['renderer']['input'], 'main', toggleCOInputDisable);
                affectSettings(settings['renderer']['input'], 'main', toggleCOInputDisable);
                if (!settings['renderer']['input']['pop-size']['disable']) {
                    fetch(settings['renderer']['input']['genes-data-path']['value'])
                        .then(res => res.text())
                        .then(data => {
                        sendParameter('genes_data', data);
                        sendParameter('user_code_path', settings['renderer']['input']['fitness-function-path']['value']);
                    })
                        .catch(() => {
                        sendParameter('user_code_path', settings['renderer']['input']['fitness-function-path']['value']);
                    });
                }
                toggleRedDot();
                sendParams();
            });
        };
        window.addEventListener('beforeunload', () => {
            ipcRenderer.send('close-ga-cp');
            main.classList.add('hide');
            window['sendSig']('stop');
        });
    })();
});
if (window['isDev']) {
    window['k-shorts'](prime, side, ipcRenderer);
    delete window['k-shorts'];
}
//# sourceMappingURL=renderer.js.map