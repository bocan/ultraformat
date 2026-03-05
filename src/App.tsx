import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import JsonFormatter from './pages/JsonFormatter';
import DiffChecker from './pages/DiffChecker';
import Base64Codec from './pages/Base64Codec';
import CodeBeautify from './pages/CodeBeautify';
import RegexTester from './pages/RegexTester';
import UrlCodec from './pages/UrlCodec';
import JwtDecoder from './pages/JwtDecoder';
import ColorConverter from './pages/ColorConverter';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="json" element={<JsonFormatter />} />
        <Route path="diff" element={<DiffChecker />} />
        <Route path="base64" element={<Base64Codec />} />
        <Route path="beautify" element={<CodeBeautify />} />
        <Route path="regex" element={<RegexTester />} />
        <Route path="url" element={<UrlCodec />} />
        <Route path="jwt" element={<JwtDecoder />} />
        <Route path="color" element={<ColorConverter />} />
      </Route>
    </Routes>
  );
}
