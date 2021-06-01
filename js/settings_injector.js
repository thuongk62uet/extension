let img = document.createElement('img');
let imgSettings = chrome.runtime.getURL("images/settings1.svg");
img.src = imgSettings;
img.style.width = '19px';
img.style.height = '30px';

let div = document.createElement('div');
div.appendChild(img);
div.style.position = 'absolute';
div.style.width = '40px';
div.style.height = '40px';
div.style.top = '5px';
div.style.left = '-48px';
div.style['border-radius'] = '25px';
div.style.display = 'flex';
div.style['align-items'] = 'center';
div.style['justify-content'] = 'center';

let parentForSettings = document.getElementsByClassName('gb_Xd gb_Ta gb_Jd')[0];
parentForSettings.style.position = 'relative';
parentForSettings.appendChild(div);

img.addEventListener('click', () => {
    chrome.runtime.sendMessage({
        action: 'openSettings'
    });
});

div.addEventListener('mouseover', () => {
    div.style.background = 'rgba(60,64,67,0.08)';
});

div.addEventListener('mouseout', () => {
    div.style.background = 'white';
});
