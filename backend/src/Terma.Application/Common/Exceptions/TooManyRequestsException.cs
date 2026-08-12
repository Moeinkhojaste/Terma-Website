namespace Terma.Application.Common.Exceptions;

public sealed class TooManyRequestsException(string message, int retryAfterSeconds = 60) : Exception(message)
{
    public int RetryAfterSeconds { get; } = retryAfterSeconds;
}
