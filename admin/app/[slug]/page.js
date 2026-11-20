import AdminHome from '../AdminHome';

export default function StoreAdminPage({ params }) {
  return <AdminHome key={params.slug} storeSlug={params.slug} />;
}
