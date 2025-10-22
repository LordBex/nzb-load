var isInstalled = false
var version = ""

function refreshPage() {
    if (!isInstalled) {
        return;
    }

    document.querySelectorAll('.is-not-installed').forEach((el) => {
        el.classList.remove('is-not-installed')
        el.classList.add('is-installed')
    })
    document.querySelectorAll('.nzb-load-version').forEach((el) => {
        el.textContent = version
    })

    document.querySelectorAll('.open-nzbload-settings').forEach((el) => {
        if (el.dataset.init == "1") {
            return;
        }

        el.addEventListener('click', () => {
            el.dataset.init = "1"
            document.dispatchEvent(new CustomEvent('open-nzbload-settings', {}));
        });
    })
}

// UserScript integration
document.addEventListener('init-nzb-load', (event) => {
    isInstalled = true
    version = event.detail?.version || '';
    refreshPage()
});

document$.subscribe(function() {
    refreshPage()
});



document$.subscribe(function () {
    refreshPage()
});
