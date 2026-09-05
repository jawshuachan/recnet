namespace recnet.Shared.Models;

public class User
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public int Age { get; set; }
    // each user will have a set of preferences that will then be projected into a Neo4j query for recommendations
}
