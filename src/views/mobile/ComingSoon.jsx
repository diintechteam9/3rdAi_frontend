export default {
  name: 'ComingSoon',
  setup() {
    return () => (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '1rem'
        }}>
          🚀
        </div>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: '#1a1a2e',
          marginBottom: '1rem'
        }}>
          Coming Soon
        </h1>
        <p style={{
          fontSize: '1.2rem',
          color: '#6b7280',
          maxWidth: '500px',
          lineHeight: '1.6'
        }}>
          We're working hard to bring you this amazing feature. Stay tuned for updates!
        </p>
      </div>
    );
  }
};