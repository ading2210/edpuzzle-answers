#Copyright (C) 2026 ading2210
#see README.md for more information

import traceback
import functools

class BadRequestError(Exception):
  status_code = 400

class UnauthorizedError(Exception):
  status_code = 401

class ForbiddenError(Exception):
  status_code = 403

class InternalServerError(Exception):
  status_code = 500

class BadGatewayError(Exception):
  status_code = 502

class ServiceUnavailableException(Exception):
  status_code = 503

include_traceback = False

#convert an exception into a flask response
def create_exception_response(exception, debug=None, status_code=None):
  if isinstance(exception, Exception):
    message = str(exception)
    exception_type = exception.__class__.__name__
    if status_code != None:
      status = status_code
    elif hasattr(exception, "status_code"):
      status = exception.status_code
    else:
      status = 500

    response = {
      "error": exception_type,
      "status": status,
      "message": message
    }
    if include_traceback:
      response["traceback"] = "".join(traceback.format_tb(exception.__traceback__))
    
    return response, status
    
  else:
    return {
      "error": "Unknown",
      "status": 500
    }, 500

def handle_exception(func):
  @functools.wraps(func)
  def decorator(*args, **kwargs):
    try:
      return func(*args, **kwargs)
    except Exception as e:
      return create_exception_response(e)
  return decorator