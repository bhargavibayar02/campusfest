export function notFound(_req, res) {
  res.status(404).json({ success: false, error: 'The requested resource was not found.' })
}

export function errorHandler(error, _req, res, _next) {
  if (error?.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Please check the submitted information.',
      details: error.issues.map(({ path, message }) => ({ field: path.join('.'), message })),
    })
  }
  if (error?.code === 11000) {
    return res.status(409).json({ success: false, error: 'A record with these details already exists.' })
  }
  if (error?.name === 'CastError') {
    return res.status(400).json({ success: false, error: 'The requested identifier is invalid.' })
  }
  if (process.env.NODE_ENV !== 'production') console.error(error)
  res.status(error?.statusCode || 500).json({
    success: false,
    error: error?.statusCode ? error.message : 'An unexpected server error occurred.',
  })
}
