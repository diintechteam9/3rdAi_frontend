import { useRouter } from 'vue-router';

export default {
  name: 'Tools',
  setup() {
    const router = useRouter();

    const navigateToSankalp = () => {
      router.push('/admin/sankalp');
    };

    return () => (
      <div class="container-fluid p-4">
        <h1 class="mb-4">Tools</h1>
      
      
      </div>
    );
  }
};
