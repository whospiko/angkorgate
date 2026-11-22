export interface OidcDiscoveryDoc {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
  jwks_uri: string
  response_types_supported: string[]
  subject_types_supported: string[]
  id_token_signing_alg_values_supported: string[]
  scopes_supported: string[]
  token_endpoint_auth_methods_supported: string[]
  claims_supported: string[]
  code_challenge_methods_supported?: string[]
}

export interface JwksKey {
  kty: string
  use?: string
  kid?: string
  alg?: string
  n?: string
  e?: string
  crv?: string
  x?: string
  y?: string
}

export interface JwksResponse {
  keys: JwksKey[]
}
