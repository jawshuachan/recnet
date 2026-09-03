namespace recnet.Shared.Models;

public enum MediaType
{
    Movie,
    TvSeries
}

public class Media
{
    public int Id { get; set; }
    public string? MediaTitle { get; set; }
    public MediaType Type { get; set; }
    public string? Region { get; set; }
    public string? Genre { get; set; }
}
