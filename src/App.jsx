import { useState, useEffect } from 'react';
import KakaoMap from './components/KakaoMap';
import Sidebar from './components/Sidebar';
import './App.css';

export default function App() {
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/data/index.json')
      .then((r) => r.json())
      .then((data) => {
        setDates(data);
        if (data.length > 0) setSelectedDate(data[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    setSelectedRecord(null);
    fetch(`/data/${selectedDate}.json`)
      .then((r) => r.json())
      .then((data) => {
        setRecords(data);
        setLoading(false);
      })
      .catch(() => {
        setRecords([]);
        setLoading(false);
      });
  }, [selectedDate]);

  return (
    <div className="app">
      <Sidebar
        dates={dates}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        records={records}
        selectedRecord={selectedRecord}
        loading={loading}
      />
      <div className="map-wrap">
        <KakaoMap records={records} onSelect={setSelectedRecord} />
      </div>
    </div>
  );
}
