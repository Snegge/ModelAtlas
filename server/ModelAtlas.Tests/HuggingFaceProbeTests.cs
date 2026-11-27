using System.Net;
using System.Text;
using System.Text.Json;
using ModelAtlas.Api;
using Xunit;

namespace ModelAtlas.Tests;

public sealed class HuggingFaceProbeTests
{
    sealed class Handler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => Task.FromResult(respond(request));
    }

    [Fact] public async Task TokenNeverReachesDownloadHostOrObservations()
    {
        var calls = 0;
        var fake = "hf_" + "UNITTESTONLY";
        using var client = new HttpClient(new Handler(request =>
        {
            calls++;
            Assert.Equal("bytes=0-15", request.Headers.Range?.ToString());
            if (calls == 1)
            {
                Assert.Equal(fake, request.Headers.Authorization?.Parameter);
                var redirect = new HttpResponseMessage(HttpStatusCode.Redirect);
                redirect.Headers.Location = new Uri("https://cas-bridge.xethub.hf.co/file?signature=private");
                return redirect;
            }
            Assert.Null(request.Headers.Authorization);
            var response = new HttpResponseMessage(HttpStatusCode.PartialContent) { Content = new ByteArrayContent([1, 2]) };
            response.Content.Headers.ContentRange = new System.Net.Http.Headers.ContentRangeHeaderValue(0, 1, 2);
            return response;
        }));
        var probe = new HuggingFaceProbe(client, fake);
        var result = await probe.Get("gguf", "https://huggingface.co/test/repo/resolve/main/file", 16, true);
        Assert.Equal(2, result.Body.Length);
        Assert.Equal(2, calls);
        var report = JsonSerializer.Serialize(probe.Observations);
        Assert.DoesNotContain(fake, report);
        Assert.DoesNotContain("signature", report);
    }

    [Fact] public async Task StopsAfterRateLimitWithoutRetryingOrReadingErrorBody()
    {
        var calls = 0;
        using var client = new HttpClient(new Handler(_ =>
        {
            calls++;
            var response = new HttpResponseMessage(HttpStatusCode.TooManyRequests) { Content = new StringContent("do not log this") };
            response.Headers.TryAddWithoutValidation("Retry-After", "300");
            return response;
        }));
        var probe = new HuggingFaceProbe(client, null);
        Assert.Equal("rate_limited", (await Assert.ThrowsAsync<ProbeFailure>(() => probe.Get("test", "https://huggingface.co/api/models"))).Status);
        Assert.Equal("skipped_after_rate_limit", (await Assert.ThrowsAsync<ProbeFailure>(() => probe.Get("test2", "https://huggingface.co/api/models"))).Status);
        Assert.Equal(1, calls);
        Assert.DoesNotContain("do not log", JsonSerializer.Serialize(probe.Observations));
    }

    [Fact] public async Task RejectsIgnoredRangesAndUntrustedRedirects()
    {
        using var client = new HttpClient(new Handler(_ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(new byte[1]) }));
        var probe = new HuggingFaceProbe(client, null);
        Assert.Equal("bounded_range_not_honored", (await Assert.ThrowsAsync<ProbeFailure>(() => probe.Get("test", "https://huggingface.co/file", 16, true))).Status);
        using var other = new HttpClient(new Handler(_ =>
        {
            var response = new HttpResponseMessage(HttpStatusCode.Redirect);
            response.Headers.Location = new Uri("https://attacker.test/file");
            return response;
        }));
        Assert.Equal("untrusted_redirect_host", (await Assert.ThrowsAsync<ProbeFailure>(() => new HuggingFaceProbe(other, null).Get("test", "https://huggingface.co/file"))).Status);
    }

    [Theory]
    [InlineData(401, true, true, "invalid_or_expired_credentials")]
    [InlineData(401, false, false, "credentials_required_or_private_resource")]
    [InlineData(403, true, false, "permission_denied")]
    [InlineData(402, true, false, "payment_required_no_paid_fallback")]
    [InlineData(404, true, false, "not_found_or_hidden")]
    [InlineData(429, true, false, "rate_limited")]
    public void DistinguishesAccessAndDataFailures(int code, bool token, bool identity, string expected) =>
        Assert.Equal(expected, HuggingFaceProbe.Classify(code, token, identity));

    [Fact] public void MissingNullAndEmptyAreDifferentFromZeroOrFalse()
    {
        using var doc = JsonDocument.Parse("{\"null\":null,\"empty\":[],\"zero\":0,\"false\":false}");
        Assert.Equal("absent", HuggingFaceProbe.FieldState(HuggingFaceProbe.Field(doc.RootElement, "missing")));
        Assert.Equal("null", HuggingFaceProbe.FieldState(HuggingFaceProbe.Field(doc.RootElement, "null")));
        Assert.Equal("empty", HuggingFaceProbe.FieldState(HuggingFaceProbe.Field(doc.RootElement, "empty")));
        Assert.Equal("present", HuggingFaceProbe.FieldState(HuggingFaceProbe.Field(doc.RootElement, "zero")));
        Assert.Equal("present", HuggingFaceProbe.FieldState(HuggingFaceProbe.Field(doc.RootElement, "false")));
    }

    [Fact] public void FollowsOnlySameEndpointPagination()
    {
        const string start = "https://huggingface.co/api/models?limit=2";
        Assert.Equal(start + "&cursor=abc", HuggingFaceProbe.NextPage($"<{start}&cursor=abc>; rel=\"next\"", start));
        Assert.Null(HuggingFaceProbe.NextPage(null, start));
        Assert.Throws<ProbeFailure>(() => HuggingFaceProbe.NextPage("<https://attacker.test/api/models>; rel=next", start));
        Assert.Throws<ProbeFailure>(() => HuggingFaceProbe.NextPage("<http://huggingface.co/api/models>; rel=next", start));
    }

    [Fact] public void RedactsCredentialsEvenInServerControlledFields()
    {
        var fake = "hf_" + "UNITTESTONLY";
        var output = HuggingFaceProbe.Redact("reflected=" + fake + " hf_anotherExample", fake);
        Assert.DoesNotContain(fake, output);
        Assert.DoesNotContain("hf_", output);
    }

    static byte[] Header()
    {
        using var bytes = new MemoryStream();
        using var writer = new BinaryWriter(bytes, Encoding.UTF8, leaveOpen: true);
        void Text(string value) { writer.Write((ulong)Encoding.UTF8.GetByteCount(value)); writer.Write(Encoding.UTF8.GetBytes(value)); }
        writer.Write(0x46554747u); writer.Write(3u); writer.Write(0ul); writer.Write(3ul);
        Text("general.file_type"); writer.Write(4u); writer.Write(15u);
        Text("general.architecture"); writer.Write(8u); Text("qwen2");
        Text("tokenizer.ggml.tokens"); writer.Write(9u); writer.Write(8u); writer.Write(2ul); Text("a"); Text("b");
        return bytes.ToArray();
    }

    [Fact] public void GgufReadsMetadataSkipsTokenizerAndDetectsTruncation()
    {
        var bytes = Header();
        var header = GgufMetadata.Read(bytes);
        Assert.True(header.Complete);
        Assert.Equal(15u, header.Fields["general.file_type"]);
        Assert.Equal("qwen2", header.Fields["general.architecture"]);
        Assert.DoesNotContain("tokenizer.ggml.tokens", header.Fields.Keys);
        Assert.False(GgufMetadata.Read(bytes[..^1]).Complete);
        bytes[0] = 0;
        Assert.Throws<ProbeFailure>(() => GgufMetadata.Read(bytes));
    }
}
