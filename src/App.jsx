import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Table, Alert, Modal, ListGroup, Navbar, Nav } from 'react-bootstrap';
import { FaYoutube, FaHome, FaSearch, FaDatabase } from 'react-icons/fa';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEye, faThumbsUp, faComment, faEye as faEyeView } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import axios from 'axios';

const formatNumber = (number) => {
  if (number === null || number === undefined) return '0';
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

function App() {
  const [channelUrl, setChannelUrl] = useState('');
  const [channels, setChannels] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channelVideos, setChannelVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'channel', 'search'
  const [searchTerm, setSearchTerm] = useState('');
  
  const handleDelete = async (channelName) => {
    const result = await Swal.fire({
      title: 'Estas seguro?',
      text: `Deseas eliminar el canal ${channelName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Su00ed, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        // Buscar el ID del canal en los resultados originales
        const channelToDelete = channels.find(ch => ch.name === channelName);
        if (!channelToDelete) throw new Error('Canal no encontrado');

        await axios.delete(`${BASEROW_API_URL}${channelToDelete.id}/`, {
          headers: {
            'Authorization': `Token ${BASEROW_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        await Swal.fire(
          'u00a1Eliminado!',
          'El canal ha sido eliminado correctamente.',
          'success'
        );

        await refreshChannels();
      } catch (error) {
        console.error('Error al eliminar el canal:', error);
        Swal.fire(
          'Error',
          'No se pudo eliminar el canal. Por favor, intenta nuevamente.',
          'error'
        );
      }
    }
  };

  const refreshChannels = async () => {
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
          id: channel.id,
          name: channel.field_6162,
          views: channel.field_6165,
          subscribers: channel.field_6166,
          videos: channel.field_6167
        }));
        setChannels(channelsData);
      } else {
        setChannels([]);
      }
    } catch (error) {
      console.error('Error al cargar datos de Baserow:', error);
      setError('Error al cargar los canales. Por favor, recarga la pu00e1gina.');
      setChannels([]);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    refreshChannels();
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
          subscriberCount: channelData.statistics.subscriberCount || 0,
          videoCount: channelData.statistics.videoCount || 0
        }
      };
      
      await saveToBaserow(newChannelData);
      
      const newChannel = {
        name: channelData.snippet.title,
        views: channelData.statistics.viewCount,
        subscribers: channelData.statistics.subscriberCount || 0,
        videos: channelData.statistics.videoCount || 0
      };
      
      await refreshChannels();
      setChannelUrl('');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
  const BASEROW_TOKEN = import.meta.env.VITE_BASEROW_TOKEN;
  const BASEROW_API_URL = import.meta.env.VITE_BASEROW_API_URL;

  const getChannelId = async (url) => {
    try {
      console.log('Intentando obtener ID del canal:', url);
      const regex = /(?:youtube\.com\/(?:channel\/|c\/|@)|youtu\.be\/)([^\s/]+)/;
      const match = url.match(regex);
      if (!match) {
        console.error('URL no coincide con el formato esperado:', url);
        throw new Error('URL de canal invu00e1lida. Debe ser una URL de canal de YouTube (ejemplo: https://youtube.com/c/nombrecanal)');
      }
      
      console.log('ID del canal encontrado:', match[1]);
      let response;
      
      // Primero intentamos buscar por ID del canal
      response = await axios.get(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${match[1]}&key=${YOUTUBE_API_KEY}`);
      
      // Si no encontramos resultados, intentamos buscar por nombre del canal
      if (!response.data.items || response.data.items.length === 0) {
        response = await axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${match[1]}&key=${YOUTUBE_API_KEY}`);
        
        if (!response.data.items || response.data.items.length === 0) {
          console.error('No se encontro informaciu00f3n del canal');
          throw new Error('No se encontro el canal. Verifica la URL e intenta nuevamente.');
        }
        
        // Obtenemos los detalles del canal usando el ID encontrado
        const channelId = response.data.items[0].id.channelId;
        response = await axios.get(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`);
      }
      
      console.log('Informaciu00f3n del canal obtenido:', response.data.items[0]);
      return response.data.items[0];
    } catch (error) {
      console.error('Error en getChannelId:', error);
      if (error.response) {
        console.error('Respuesta de error de la API:', error.response.data);
      }
      throw new Error(error.message || 'Error al obtener informaciu00f3n del canal');
    }
  };

  const saveToBaserow = async (channelData) => {
    try {
      if (!channelData?.snippet?.title && !channelData?.name) {
        throw new Error('Datos del canal incompletos');
      }

      const dataToSave = {
        field_6162: channelData.snippet?.title || channelData.name,
        field_6165: parseInt(channelData.statistics?.viewCount || channelData.views) || 0,
        field_6166: parseInt(channelData.statistics?.subscriberCount || channelData.subscribers) || 0,
        field_6167: parseInt(channelData.statistics?.videoCount || channelData.videos) || 0
      };

      const response = await axios.post(BASEROW_API_URL, dataToSave, {
        headers: {
          'Authorization': `Token ${BASEROW_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data) {
        throw new Error('No se recibio una respuesta de Baserow');
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

  // Funciu00f3n para manejar la navegaciu00f3n entre pu00e1ginas
  const handleNavigation = (page) => {
    setPageLoading(true);
    setTimeout(() => {
      setCurrentPage(page);
      if (page === 'home') {
        setSelectedChannel(null);
      }
      if (page === 'search') {
        // Limpiar resultados anteriores al navegar a la pu00e1gina de bu00fasqueda
        setChannelVideos([]);
        setSearchTerm('');
      }
      setPageLoading(false);
    }, 300); // Pequeu00f1o retraso para mostrar la animaciu00f3n
  };

  const handleViewChannel = async (channelId, channelName) => {
    try {
      // Limpiar resultados anteriores antes de realizar una nueva búsqueda
      setChannelVideos([]);
      setLoadingVideos(true);
      setSelectedChannel({ id: channelId, name: channelName });
      setPageLoading(true); // Activar el gif de carga para la transición de página
      setCurrentPage('channel'); // Cambiar a la página de canal
      
      const channelInfo = channels.find(ch => ch.id === channelId);
      if (!channelInfo) throw new Error('Canal no encontrado');
      
      // Buscar el canal en YouTube para obtener su ID real
      let response;
      
      // Primero intentamos una búsqueda exacta con comillas
      response = await axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q="${encodeURIComponent(channelInfo.name)}"&key=${YOUTUBE_API_KEY}`);
      
      // Si no hay resultados, intentamos sin comillas
      if (!response.data.items || response.data.items.length === 0) {
        response = await axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(channelInfo.name)}&key=${YOUTUBE_API_KEY}`);
      }
      
      // Si aún no hay resultados, intentamos con una búsqueda más amplia
      if (!response.data.items || response.data.items.length === 0) {
        const simplifiedName = channelInfo.name.split(' ')[0]; // Tomamos solo la primera palabra
        response = await axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(simplifiedName)}&key=${YOUTUBE_API_KEY}`);
      }
      
      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('No se pudo encontrar el canal en YouTube');
      }
      
      // Intentamos encontrar una coincidencia exacta o la más cercana
      let youtubeChannelId = null;
      const exactMatch = response.data.items.find(item => 
        item.snippet.title.toLowerCase() === channelInfo.name.toLowerCase() ||
        item.snippet.channelTitle.toLowerCase() === channelInfo.name.toLowerCase()
      );
      
      if (exactMatch) {
        youtubeChannelId = exactMatch.id.channelId;
      } else {
        // Si no hay coincidencia exacta, tomamos el primer resultado
        youtubeChannelId = response.data.items[0].id.channelId;
      }
      
      console.log('Canal encontrado en YouTube:', youtubeChannelId);
      
      // Obtener los últimos 10 videos del canal
      const videosResponse = await axios.get(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${youtubeChannelId}&maxResults=10&order=date&type=video&key=${YOUTUBE_API_KEY}`
      );
      
      if (videosResponse.data.items && videosResponse.data.items.length > 0) {
        // Obtener detalles adicionales (estadísticas) para cada video
        const videoIds = videosResponse.data.items.map(video => video.id.videoId).join(',');
        const videoDetailsResponse = await axios.get(
          `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`
        );
        
        // Combinar los datos de los videos con sus estadísticas
        const videosWithStats = videosResponse.data.items.map(video => {
          const stats = videoDetailsResponse.data.items.find(item => item.id === video.id.videoId)?.statistics || {
            viewCount: 0,
            likeCount: 0,
            commentCount: 0
          };
          
          return {
            ...video,
            statistics: {
              viewCount: stats.viewCount || 0,
              likeCount: stats.likeCount || 0,
              commentCount: stats.commentCount || 0
            }
          };
        });
        
        // Ordenar los videos por fecha de publicación (más recientes primero)
        const sortedVideos = videosWithStats.sort((a, b) => {
          const dateA = new Date(a.snippet.publishedAt);
          const dateB = new Date(b.snippet.publishedAt);
          return dateB - dateA; // Orden descendente (más reciente primero)
        });
        
        setChannelVideos(sortedVideos);
      } else {
        setChannelVideos([]);
      }
    } catch (error) {
      console.error('Error al obtener videos del canal:', error);
      Swal.fire(
        'Error',
        'No se pudieron cargar los videos del canal. Por favor, intenta nuevamente.',
        'error'
      );
      setSelectedChannel(null);
      setCurrentPage('home');
    } finally {
      setLoadingVideos(false);
      setPageLoading(false); // Desactivar el gif de carga cuando termina la carga
    }
  };

  // Función para buscar videos por término
  const handleSearchByTerm = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      Swal.fire('Error', 'Por favor ingresa un tu00e9rmino de bu00fasqueda', 'error');
      return;
    }
    
    setPageLoading(true);
    setLoadingVideos(true);
    
    try {
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=14&q=${searchTerm}&type=video&key=${YOUTUBE_API_KEY}`
      );
      
      if (response.data.items && response.data.items.length > 0) {
        // Obtener detalles adicionales (estadu00edsticas) para cada video
        const videoIds = response.data.items.map(video => video.id.videoId).join(',');
        const videoDetailsResponse = await axios.get(
          `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`
        );
        
        // Combinar los datos de los videos con sus estadu00edsticas
        const videosWithStats = response.data.items.map(video => {
          const stats = videoDetailsResponse.data.items.find(item => item.id === video.id.videoId)?.statistics || {
            viewCount: 0,
            likeCount: 0,
            commentCount: 0
          };
          
          return {
            ...video,
            statistics: {
              viewCount: stats.viewCount || 0,
              likeCount: stats.likeCount || 0,
              commentCount: stats.commentCount || 0
            }
          };
        });
        
        // Ordenar los videos por fecha de publicaciu00f3n (mu00e1s recientes primero)
        const sortedVideos = videosWithStats.sort((a, b) => {
          const dateA = new Date(a.snippet.publishedAt);
          const dateB = new Date(b.snippet.publishedAt);
          return dateB - dateA; // Orden descendente (mu00e1s reciente primero)
        });
        
        setChannelVideos(sortedVideos);
      } else {
        setChannelVideos([]);
      }
    } catch (error) {
      console.error('Error al buscar videos:', error);
      Swal.fire(
        'Error',
        'No se pudieron cargar los resultados de bu00fasqueda. Por favor, intenta nuevamente.',
        'error'
      );
      setChannelVideos([]);
    } finally {
      setLoadingVideos(false);
      setPageLoading(false);
    }
  };

  // Renderizado de la lista de videos (compartido entre la vista de canal y bu00fasqueda)
  const renderVideosList = () => {
    if (loadingVideos) {
      return (
        <div className="text-center py-4">
          <p>Cargando videos...</p>
        </div>
      );
    }
    
    if (channelVideos.length === 0) {
      return <Alert variant="info">No se encontraron videos.</Alert>;
    }
    
    return (
      <div>
        <div className="row">
          {channelVideos.map((video) => (
            <div className="col-md-6 mb-4" key={video.id.videoId}>
              <div className="card h-100">
                <div className="card-body">
                  <div className="d-flex mb-3">
                    <img 
                      src={video.snippet.thumbnails.medium.url} 
                      alt={video.snippet.title} 
                      className="me-3" 
                      style={{ width: '160px', height: '90px', objectFit: 'cover' }}
                    />
                    <div>
                      <h5 className="card-title">{video.snippet.title}</h5>
                      <p className="text-muted small">
                        {new Date(video.snippet.publishedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center">
                      <span className="me-3">
                        <FontAwesomeIcon icon={faEyeView} className="text-secondary me-1" />
                        {formatNumber(video.statistics.viewCount)} visitas
                      </span>
                      <span className="me-3">
                        <FontAwesomeIcon icon={faThumbsUp} className="text-primary me-1" />
                        {formatNumber(video.statistics.likeCount)} likes
                      </span>
                      <span>
                        <FontAwesomeIcon icon={faComment} className="text-success me-1" />
                        {formatNumber(video.statistics.commentCount)} comentarios
                      </span>
                    </div>
                  </div>
                  <a href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-danger">
                    Ver en YouTube
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Container className="mt-4">
      {/* Header con navegaciu00f3n */}
      <Navbar bg="light" expand="lg" className="mb-4 rounded shadow-sm">
        <Container>
          <Navbar.Brand className="d-flex align-items-center gap-2">
            <FaYoutube className="text-danger" size={30} />
            Brain-Tube
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              <Button 
                variant={currentPage === 'home' ? 'primary' : 'outline-primary'} 
                className="me-2 d-flex align-items-center gap-2"
                onClick={() => handleNavigation('home')}
              >
                <FaDatabase /> Canales de youtube guardados en la base de datos
              </Button>
              <Button 
                variant={currentPage === 'search' ? 'primary' : 'outline-primary'} 
                className="d-flex align-items-center gap-2"
                onClick={() => handleNavigation('search')}
              >
                <FaSearch /> Buscar por palabra y/o término
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Overlay de carga para transiciones entre pu00e1ginas */}
      {pageLoading && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999
          }}
        >
          <div className="text-center">
            <div 
              className="spinner-border text-danger" 
              style={{ width: '3rem', height: '3rem' }} 
              role="status"
            >
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="mt-2">Cargando...</p>
          </div>
        </div>
      )}

      {/* Pagina de inicio (lista de canales) */}
      {currentPage === 'home' && (
        <>
          <Form onSubmit={handleSubmit} className="mb-4">
            <Form.Group className="mb-3">
              <Form.Label>URL del Canal</Form.Label>
              <Form.Control
                type="text"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                placeholder="Ingrese la URL del canal de YouTube"
                disabled={loading}
              />
            </Form.Group>
            
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Canal'}
            </Button>
          </Form>
          
          <h4 className="mb-3">Canales Guardados</h4>
          {tableLoading ? (
            <p>Cargando datos...</p>
          ) : (
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Canal</th>
                  <th>Vistas</th>
                  <th>Suscriptores</th>
                  <th>Videos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((channel, index) => (
                  <tr key={index}>
                    <td>{channel.name}</td>
                    <td>{formatNumber(channel.views)}</td>
                    <td>{formatNumber(channel.subscribers)}</td>
                    <td>{formatNumber(channel.videos)}</td>
                    <td>
                      <Button
                        variant="link"
                        className="text-danger"
                        onClick={() => handleDelete(channel.name)}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </Button>
                      <Button
                        variant="link"
                        className="text-primary"
                        onClick={() => handleViewChannel(channel.id, channel.name)}
                        title="Ver detalles del canal"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </Button>
                    </td>
                  </tr>
                ))}
                {channels.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center">No hay canales guardados</td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </>
      )}

      {/* Pagina de canal individual */}
      {currentPage === 'channel' && selectedChannel && (
        <div className="channel-single-page">

          <div className="row">
            <div className="col-md-4">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">Información del Canal</h5>
                  {channels.map((channel) => {
                    if (channel.id === selectedChannel.id) {
                      return (
                        <div key={channel.id}>
                          <p><strong>Nombre:</strong> {channel.name}</p>
                          <p><strong>Vistas totales:</strong> {formatNumber(channel.views)}</p>
                          <p><strong>Suscriptores:</strong> {formatNumber(channel.subscribers)}</p>
                          <p><strong>Videos:</strong> {formatNumber(channel.videos)}</p>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>
          </div>
          
          <h4 className="mb-3 my-3">Últimos 10 videos</h4>
          {renderVideosList()}
        </div>
      )}

      {/* Pu00e1gina de bu00fasqueda por tu00e9rmino */}
      {currentPage === 'search' && (
        <div className="search-page">
          <h5 className="mb-4">Buscar videos por término o palabra clave</h5>
          
          <Form onSubmit={handleSearchByTerm} className="mb-4">
            <div className="d-flex gap-2">
              <Form.Control
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ingresa tu busqueda"
                disabled={loadingVideos}
              />
              <Button 
                variant="primary" 
                type="submit" 
                disabled={loadingVideos}
                className="d-flex align-items-center gap-2"
              >
                <FaSearch /> Buscar
              </Button>
            </div>
          </Form>
          {channelVideos.length > 0 ? (
            <>
              <h4 className="mb-3">Últimos videos relacionados con tu búsqueda (ordenados por fecha más reciente)</h4>
              {renderVideosList()}
            </>
          ) : (
            searchTerm.trim() && !loadingVideos ? (
              <Alert variant="info">No se encontraron videos relacionados con tu búsqueda.</Alert>
            ) : null
          )}
          
          {searchTerm.trim() === '' && !loadingVideos && (
            <Alert variant="secondary">Ingresa un término de búsqueda y presiona el botón Buscar para ver resultados.</Alert>
          )}
          {renderVideosList()}
        </div>
      )}
    </Container>
  );
}

export default App;
