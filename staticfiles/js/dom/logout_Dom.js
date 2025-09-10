import { api_Logout } from '../apis.js';

export async function logout() {
    const response = await api_Logout();
    if (response.ok) {
        window.location.href = '/';
    } else {
        alert('Logout failed');
    }
}