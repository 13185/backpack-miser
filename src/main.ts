import './ui/style.css';
import { App } from './ui/app';
window.addEventListener('error', e => console.error('运行错误', e.message));
new App();
