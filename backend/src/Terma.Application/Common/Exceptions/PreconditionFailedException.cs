namespace Terma.Application.Common.Exceptions;

public sealed class PreconditionFailedException(string message) : Exception(message);
