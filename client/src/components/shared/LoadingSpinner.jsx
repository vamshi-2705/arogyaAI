/**
 * Shared loading spinner component.
 */
export default function LoadingSpinner({ size = 'medium', color = '#075E54' }) {
  const sizes = { small: 18, medium: 36, large: 56 };
  const px = sizes[size] || 36;

  return (
    <div
      className="spinner"
      style={{
        width: px,
        height: px,
        borderColor: `${color}33`,
        borderTopColor: color,
      }}
      role="status"
      aria-label="Loading"
    />
  );
}
