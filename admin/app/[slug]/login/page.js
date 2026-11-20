import LoginForm from '../../login-form';

export default function StoreLoginPage({ params }) {
  return <LoginForm storeSlug={params.slug} />;
}
