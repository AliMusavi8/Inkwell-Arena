import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import './Layout.css';

export default function Layout() {
    return (
        <div className="layout">
            <TopBar />
            <main className="layout-content">
                <Outlet />
            </main>
        </div>
    );
}
