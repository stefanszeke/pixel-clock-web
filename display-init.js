document.documentElement.classList.add('display-mode');
if(new URLSearchParams(location.search).get('floating')==='1')document.documentElement.classList.add('floating-mode');
