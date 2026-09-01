FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files and restore dependencies for efficient layer caching
COPY Directory.Build.targets* ./
COPY src/Terma.Domain/Terma.Domain.csproj src/Terma.Domain/
COPY src/Terma.Application/Terma.Application.csproj src/Terma.Application/
COPY src/Terma.Infrastructure/Terma.Infrastructure.csproj src/Terma.Infrastructure/
COPY src/Terma.Api/Terma.Api.csproj src/Terma.Api/

RUN dotnet restore src/Terma.Api/Terma.Api.csproj

# Copy the rest of the backend source code and build
COPY src/ src/
WORKDIR /src/src/Terma.Api
RUN dotnet publish Terma.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

ENV ASPNETCORE_URLS=http://+:8080
ENV DOTNET_EnableDiagnostics=0

COPY --from=build /app/publish .

RUN mkdir -p /app/media /app/dataprotection-keys

EXPOSE 8080
ENTRYPOINT ["dotnet", "Terma.Api.dll"]
