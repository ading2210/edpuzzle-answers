#Copyright (C) 2023 ading2210
#see README.md for more information

class UnauthorizedError(Exception):
  status_code = 401

class ForbiddenError(Exception):
  status_code = 403

class BadRequestError(Exception):
  status_code = 400

class BadGatewayError(Exception):
  status_code = 502

class ServiceUnavailableException(Exception):
  status_code = 503