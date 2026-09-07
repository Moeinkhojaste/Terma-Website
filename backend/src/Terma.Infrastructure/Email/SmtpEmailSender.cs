using System.Net;
using System.Net.Mail;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Terma.Application.Common.Interfaces;

namespace Terma.Infrastructure.Email;

public sealed class SmtpEmailSender : IEmailSender
{
    private readonly SmtpOptions _options;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(
        IOptions<SmtpOptions> options,
        IWebHostEnvironment environment,
        ILogger<SmtpEmailSender> logger)
    {
        _options = options.Value;
        _environment = environment;
        _logger = logger;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        if (!_options.IsConfigured)
        {
            _logger.LogWarning(
                ">>> [SMTP NOT CONFIGURED / DEV FALLBACK] Email to: {Email}, Subject: {Subject} <<<\nBody:\n{Body}",
                toEmail,
                subject,
                htmlBody);

            if (!_environment.IsDevelopment() && _options.Enabled && string.IsNullOrWhiteSpace(_options.Host))
            {
                _logger.LogWarning("SMTP Host is not configured in production. The email content has been logged above.");
            }
            return;
        }

        try
        {
            using var client = new SmtpClient(_options.Host, _options.Port)
            {
                EnableSsl = _options.EnableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false
            };

            if (!string.IsNullOrWhiteSpace(_options.UserName))
            {
                client.Credentials = new NetworkCredential(_options.UserName, _options.Password);
            }

            using var message = new MailMessage
            {
                From = new MailAddress(_options.FromEmail, _options.FromName, System.Text.Encoding.UTF8),
                Subject = subject,
                SubjectEncoding = System.Text.Encoding.UTF8,
                Body = htmlBody,
                BodyEncoding = System.Text.Encoding.UTF8,
                IsBodyHtml = true
            };
            message.To.Add(new MailAddress(toEmail));

            await client.SendMailAsync(message, cancellationToken);
            _logger.LogInformation("Email sent successfully via SMTP to {Email} with subject: {Subject}", toEmail, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email via SMTP to {Email}. Error: {Message}", toEmail, ex.Message);
            _logger.LogWarning(">>> [EMAIL DELIVERY EXCEPTION - FALLBACK LOG] To: {Email}\nSubject: {Subject}\nBody:\n{Body}", toEmail, subject, htmlBody);
            throw;
        }
    }
}