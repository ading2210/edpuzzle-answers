#Copyright (C) 2023 ading2210
#see README.md for more information

from modules import exceptions
import traceback

exception_dict = {
  "BadRequestError": 400,
  "UnauthorizedError": 401,
  "ForbiddenError": 403,
  "BadGatewayError": 502,
  "ServiceUnavailableException": 503
}

type_dict = {
  "str": str,
  "dict": dict,
  "list": list,
  "bool": bool,
  "int": int,
  "float": float
}

include_traceback = False

#convert an exception into a flask response
def handle_exception(exception, debug=None, status_code=None):
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