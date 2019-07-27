document.querySelector("#app").innerHTML = '';
import App from './App.svelte';
import './styles.css';
let app = new App({
    target: document.querySelector("#app")
});

// module.hot.accept((dt) => {
//     document.getElementById('main').remove();
//     let script = document.createElement('script');
//     script.src = '/main.js'
//     script.id = 'main';
//     script.async = true;

//     document.body.appendChild(script);
//     dt.close();
// });


export default app;