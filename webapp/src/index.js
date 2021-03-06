import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css';
import App from './App';
import Home from './layouts/home';
import Entrance from './layouts/entrance';
import Dashboard from './layouts/dashboard'
import StudioViewer from './layouts/studio-viewer';
import Guest from './layouts/guest';
import reportWebVitals from './reportWebVitals';

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App/>}>
          <Route path="/" element={<Home />}/>
          <Route path="virtual-studio" element={<Entrance />} />
          <Route path="virtual-studio/:name" element={<Dashboard />} />
          <Route path="viewer/:name" element={ <StudioViewer/> } />
          <Route path="guest-room/:guestId" element={ <Guest/> } />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
