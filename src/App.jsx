import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Table, Alert } from 'react-bootstrap';
import axios from 'axios';

function App() {
  const [channelUrl, setChannelUrl] = useState('');
  const [channels, setChannels] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);

  useEffect(() => {
    const fetchChannels = async () => {
      setTableLoading(true);
      try {
        const response = await axios.get(BASEROW_API_URL, {
          headers: {
            'Authorization': `Token ${BASEROW_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.data.results && response.data.results.length > 0) {
          const channelsData = response.data.results.map(channel => ({
            name: channel.NombreCanal,
            views: channel.CantidadVistas,
            likes: channel.CantidadLike
          }));
          setChannels(channelsData);
        } else {
          setChannels([]);
        }
      } catch (error) {
        console.error('Error al cargar datos de Baserow:', error);
        setError('Error al cargar los canales. Por favor, recarga la página.');
        setChannels([]);
      } finally {
        setTableLoading(false);
      }
    };

    fetchChannels();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const channelData = await getChannelId(channelUrl);
      const newChannelData = {
        snippet: {
          title: channelData.snippet.title
        },
        statistics: {
          viewCount: channelData.statistics.viewCount,
          likeCount: channelData.statistics.likeCount || 0
        }
      };
      
      await saveToBaserow(newChannelData);
      
      const newChannel = {
        name: channelData.snippet.title,
        views: channelData.statistics.viewCount,
        likes: channelData.statistics.likeCount || 0
      };
      
      setChannels([...channels, newChannel]);
      setChannelUrl('');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const YOUTUBE_API_KEY = 'AIzaSyBKFTFBgLIC_4A8zDqhB6FxXUt1yBMKlm4';
  const BASEROW_TOKEN = 'CzYl5l6YtWEctWM5teeMuKUVgKRsZCoR';
  const BASEROW_API_URL = 'https://baserow-production-83af.up.railway.app/api/database/rows/table/638/';

  const getChannelId = async (url) => {
    try {
      console.log('Intentando obtener ID del canal:', url);
      const regex = /(?:youtube\.com\/(?:channel\/|c\/|@)|youtu\.be\/)([^\s/]+)/;
      const match = url.match(regex);
      if (!match) {
        console.error('URL no coincide con el formato esperado:', url);
        throw new Error('URL de canal inválida. Debe ser una URL de canal de YouTube (ejemplo: https://youtube.com/c/nombrecanal)');
      }
      
      console.log('ID del canal encontrado:', match[1]);
      let response;
      
      // Primero intentamos buscar por ID del canal
      response = await axios.get(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${match[1]}&key=${YOUTUBE_API_KEY}`);
      
      // Si no encontramos resultados, intentamos buscar por nombre del canal
      if (!response.data.items || response.data.items.length === 0) {
        response = await axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${match[1]}&key=${YOUTUBE_API_KEY}`);
        
        if (!response.data.items || response.data.items.length === 0) {
          console.error('No se encontró información del canal');
          throw new Error('No se encontró el canal. Verifica la URL e intenta nuevamente.');
        }
        
        // Obtenemos los detalles del canal usando el ID encontrado
        const channelId = response.data.items[0].id.channelId;
        response = await axios.get(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`);
      }
      
      console.log('Información del canal obtenida:', response.data.items[0]);
      return response.data.items[0];
    } catch (error) {
      console.error('Error en getChannelId:', error);
      if (error.response) {
        console.error('Respuesta de error de la API:', error.response.data);
      }
      throw new Error(error.message || 'Error al obtener información del canal');
    }
  };

  const saveToBaserow = async (channelData) => {
    try {
      if (!channelData?.snippet?.title && !channelData?.name) {
        throw new Error('Datos del canal incompletos');
      }

      const dataToSave = {
        NombreCanal: channelData.snippet?.title || channelData.name,
        CantidadVistas: parseInt(channelData.statistics?.viewCount || channelData.views) || 0,
        CantidadLike: parseInt(channelData.statistics?.likeCount || channelData.likes) || 0
      };

      const response = await axios.post(BASEROW_API_URL, dataToSave, {
        headers: {
          'Authorization': `Token ${BASEROW_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data) {
        throw new Error('No se recibió respuesta de Baserow');
      }

      console.log('Datos guardados exitosamente en Baserow:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error en saveToBaserow:', error);
      if (error.response?.data) {
        console.error('Respuesta de error de Baserow:', error.response.data);
        throw new Error(`Error al guardar en Baserow: ${error.response.data.error || 'Intenta nuevamente'}`);
      }
      throw new Error(error.message || 'Error al guardar en Baserow. Por favor, intenta nuevamente.');
    }
  };

  return (
    <Container className="py-5">
      <h1 className="mb-4">Seguimiento de Canales de YouTube</h1>
      
      <Form onSubmit={handleSubmit} className="mb-4">
        <Form.Group className="mb-3">
          <Form.Label>URL del Canal</Form.Label>
          <Form.Control
            type="text"
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
            placeholder="Ingrese la URL del canal de YouTube"
            required
          />
        </Form.Group>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Canal'}
        </Button>
      </Form>

      {error && <Alert variant="danger">{error}</Alert>}

      {tableLoading ? (
        <Alert variant="info" className="mt-3">Cargando canales...</Alert>
      ) : (
        <>
          {channels.length > 0 ? (
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Nombre del Canal</th>
                  <th>Vistas</th>
                  <th>Likes</th>
                </tr>
              </thead>
       